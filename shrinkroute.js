"use strict";

var extend = require( "extend" );
var url = require( "url" );
var qs = require( "qs" );

// Shrinkroute constructor
// -------------------------------------------------------------------------------------------------

// Uses John Resig style constructor
// http://ejohn.org/blog/simple-class-instantiation/
function Shrinkroute( app, routes, separator ) {
    if ( this instanceof Shrinkroute ) {
        this.app( app )
            .separator( separator || "." )
            .routes( routes );
    } else {
        return new Shrinkroute( app, routes, separator );
    }
}

// Shrinkroute prototype
// -------------------------------------------------------------------------------------------------
Shrinkroute.prototype.app = function( app ) {
    var matchReq, router;
    var self = this;

    if ( app != null ) {
        this._app = app;

        router = app._router;
        matchReq = router.matchRequest;
        router.matchRequest = function() {
            var route = matchReq.apply( router, arguments );

            // If the route was matched, we'll try to find the route name
            if ( route ) {
                route.name = lookup( self, route );
            }

            return route;
        };

        // Use the middleware immediately
        app.use( middleware );
        return this;
    }

    // When no app is given, then the app is returned
    return this._app;
};

Shrinkroute.prototype.separator = function( separator ) {
    if ( separator ) {
        separator = typeof separator === "string" ? separator : this._separator;
        this._separator = separator || ".";
        return this;
    } else {
        return this._separator;
    }
};

Shrinkroute.prototype.route = function( name, path, handlersObj ) {
    var self = this;

    // If it's a object, let's try to add every key as a route
    if ( isObject( name ) ) {
        forEach( name, function( route, name ) {
            self.route( name, route );
        });

        return this;
    }

    if ( isObject( path ) ) {
        handlersObj = path;
        path = path.path;
    }

    // If it's to set a route, and no path was specified, then it's error.
    if ( ( typeof path !== "string" || !path ) ) {
        if ( handlersObj ) {
            throw new Error( "Route path not given" );
        } else {
            return extend( {}, this._routes[ name ] );
        }
    }

    this._routes[ name ] = {
        path: path,
        handlers: handlersObj
    };
    return this;
};

Shrinkroute.prototype.url = function( routeName, params, append ) {
    var fail, query;
    var path = [];
    var used = [];

    routeName = routeName.split( this.separator() );
    params = isObject( params ) ? params : {};

    while ( routeName.length ) {
        path.push( this._routes[ routeName.shift() ].path );
    }

    path = path.join( "/" );
    path = path.replace( /:([\w]+)(\??)/g, function( match, name, optional ) {
        var empty;
        optional = arguments[ 2 ] === "?";

        // Determine if this param is empty
        empty = params[ name ] == null;

        // Push to the used params, so it'll not be used when appending to the query string
        !empty && used.push( name );

        // Test to see if this route has failed - this is, it has not all required params.
        fail = fail || ( !optional && empty );

        return optional && empty ? "" : params[ name ];
    });

    // If the route has failed searching for params, let's return an empty string.
    if ( fail ) {
        return "";
    }

    path = url.parse( path );

    // If the query string may receive extra params, let's do this!
    if ( append ) {
        query = qs.parse( path.query );

        forEach( params, function( val, param ) {
            if ( used.indexOf( param ) > -1 ) {
                // Don't reuse params in the query string
                return;
            }

            query[ param ] = val == null ? "" : param;
        });

        // Create the query string...
        path.search = "?" + qs.stringify( query );

        // ...if it's only a ?, then we'll be better with no query string at all.
        path.search = path.search === "?" ? "" : path.search;
    }

    return url.format( path );
};

Shrinkroute.prototype.fullUrl = function( req, routeName, params, append ) {
    var hostUrl;
    var path = this.url( routeName, params, append );
    var parsedUrl = url.parse( path );

    if ( typeof req === "string" ) {
        hostUrl = url.parse( req );

        parsedUrl.protocol = hostUrl.protocol;
        parsedUrl.host = hostUrl.host;
    } else {
        parsedUrl.protocol = req.protocol;
        parsedUrl.host = req.get( "host" );
    }

    return url.format( parsedUrl );
};

function lookup( instance, route ) {
    var name;
    var routes = instance._routes;

    for ( name in routes ) {
        if ( routes[ name ].path === route.path ) {
            return name;
        }
    }

    return null;
}

function middleware( req, res, next ) {
    // Retrieve the Shrinkroute instance
    var shrinkr = req.app.shrinkroute;

    var urlBuilder = shrinkr.url.bind( shrinkr );
    var fullUrlBuilder = shrinkr.fullUrl.bind( shrinkr, req );

    // Give locals and request patches
    req.buildUrl = urlBuilder;
    res.locals.url = urlBuilder;

    req.buildFullUrl = fullUrlBuilder;
    res.locals.fullUrl = fullUrlBuilder;

    next();
}

// Helper functions
// -------------------------------------------------------------------------------------------------

// Loop thru each key/value pair in a object, with an optional context
function forEach( obj, fn, context ) {
    return Object.keys( obj ).forEach(function( key ) {
        fn.call( context, obj[ key ], key, obj );
    });
}

// Detects whether we're dealing with an plain object
function isObject( obj ) {
    return Object.prototype.toString.call( obj ) === "[object Object]";
}