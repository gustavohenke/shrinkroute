var url = require( "url" );
var qs = require( "qs" );

// Little helper to detect if we're dealing with a plain object
function isObject( obj ) {
    return Object.prototype.toString.call( obj ) === "[object Object]";
}

function urlHelper( mapping ) {
    return function( route, params ) {
        var query;
        var path = mapping[ route ] || "";
        var used = [];

        params = isObject( params ) ? params : {};

        path = path.replace( /:([\w]+)/g, function() {
            var name = arguments[ 1 ];
            params[ name ] != null && used.push( name );

            return params[ name ];
        });

        path = url.parse( path );
        query = qs.parse( path.query );

        Object.keys( params ).forEach(function( param ) {
            var val = params[ param ];
            if ( used.indexOf( param ) > -1 ) {
                // Don't reuse params in the query string
                return;
            }

            query[ param ] = null ? "" : val;
        });

        path.search = "?" + qs.stringify( query );
        path.search = path.search === "?" ? "" : path.search;

        return url.format( path );
    };
}

module.exports = function Shrinkroute( app, routes ) {
    var routeObj, dispatcher;
    var mapping = {};

    if ( !isObject( routes ) ) {
        return false;
    }

    app.locals.url = urlHelper( mapping );

    // Hook into the Express router to give in-route helper
    dispatcher = app._router._dispatch;
    app._router._dispatch = function( req, res, next ) {
        req.buildUrl = urlHelper( mapping );
        dispatcher.call( app._router, req, res, next );
    };

    Object.keys( routes ).forEach(function( name ) {
        routeObj = routes[ name ];
        var path = routeObj.path;

        // No path = nothing to do with this
        if ( !path ) {
            return;
        }

        mapping[ name ] = path;

        // Take the path out of the way
        delete routeObj.path;

        // ...and finally loop thru the given routes to use them in Express
        Object.keys( routeObj ).forEach(function( method ) {
            app[ method ]( path, routeObj[ method ] );
        });
    });
};