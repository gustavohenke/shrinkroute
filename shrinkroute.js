(function( module, exports ) {
    "use strict";

    // Imports
    // ------------------------------------------------------------
    var url = require( "url" );
    var qs = require( "qs" );
    var extend = require( "extend" );

    // Helpers
    // ------------------------------------------------------------

    // Detects whether we're dealing with an plain object
    function isObject( obj ) {
        return Object.prototype.toString.call( obj ) === "[object Object]";
    }

    // Loop thru each key/value pair in a object.
    function forEach( obj, fn, context ) {
        return Object.keys( obj ).forEach(function( key ) {
            fn.call( context, obj[ key ], key, obj );
        });
    }

    // Iterate an routes object and try to build an nested route
    function getRoutePath( routes, name, separator ) {
        try {
            var i, len, part;
            var path = String( routes[ name ].path );
            var nameParts = name.split( separator );
            var pathPrefix = "";

            // Try to loop thru routes nested by name
            for ( i = 0, len = nameParts.length - 1; i < len; i++ ) {
                part = nameParts[ i ];

                // Skip empty part
                if ( part === "" ) {
                    continue;
                }

                // Join every route name part until here
                part = nameParts.slice( 0, i + 1 ).join( separator );
                part = routes[ part ];

                // Don't work inexistent parts of this route
                if ( !isObject( part ) || !part.path ) {
                    return;
                }

                pathPrefix += "/" + String( part.path );
            }

            path = pathPrefix + path;

            // Replace multiple slashes with only one
            path = path.replace( /\/+/g, "/" );

            return path;
        } catch ( e ) {
            return "";
        }
    }

    // Set routes in Shrinkroute and Express
    function setRoutes( instance, name, route ) {
        var merged;
        var app = instance._app;
        var separator = instance._separator;
        var routes = instance._routes || {};
        var obj = {};

        if ( !isObject( name ) ) {
            obj[ name ] = route;
        } else {
            obj = name;
        }

        merged = extend( {}, obj, routes );

        forEach( obj, function( route, name ) {
            var path = getRoutePath( merged, name, separator );

            // No path = nothing to do with this route.
            // Also, already existing routes will be skipped.
            if ( !path || routes[ name ] ) {
                return;
            }

            forEach( route, function( fn, method ) {
                // Skip the path and invalid HTTP methods
                if ( method === "path" || typeof app[ method ] !== "function" ) {
                    return;
                }

                app[ method ]( path, fn );
            });

            routes[ name ] = route;
        });

        // All done, let's update our routes object
        instance._routes = routes;
    }

    // Shrinkroute constructor
    // ------------------------------------------------------------

    // John Resig style constructors!
    function Shrinkroute( app, routes, separator ) {
        if ( this instanceof Shrinkroute ) {
            this.separator( separator || "." );
            this.app( app );
            this.route( routes );
        } else {
            return new Shrinkroute( app, routes, separator );
        }
    }

    // Shrinkroute prototype
    // ------------------------------------------------------------
    Shrinkroute.prototype.app = function( app ) {
        var urlBuilder, dispatcher;

        if ( app != null ) {
            if ( app !== this._app ) {
                // We'll patch the dispatcher... ta-da! So we'll backup it once.
                this._dispatcher = app._router._dispatch;
            }

            urlBuilder = this.url.bind( this );
            dispatcher = this._dispatcher;

            app.shrinkroute = this;

            // Give the local 'url'
            app.locals.url = urlBuilder;

            // Hook into the Express router to give in-route helper
            app._router._dispatch = function( req, res, next ) {
                req.buildUrl = urlBuilder;
                dispatcher.call( app._router, req, res, next );
            };

            this._app = app;
            return this;
        }

        return this._app;
    };

    // Get/set routes in the Shrinkroute instance and Express
    Shrinkroute.prototype.route = function( name, route ) {
        // Try to set new routes for this instance
        if ( isObject( name ) || ( typeof name === "string" && isObject( route ) ) ) {
            // If there's no app yet, routes will be simply lost for now
            if ( this._app ) {
                setRoutes( this, name, route );
            }

            return this;
        }

        // Never give an reference of our object!
        route = extend( {}, this._routes );
        if ( typeof name === "string" ) {
            route = route[ name ];
        }

        return route;
    };

    // Get/set a separator for route names
    Shrinkroute.prototype.separator = function( separator ) {
        if ( separator ) {
            separator = typeof separator === "string" ? separator : this._separator;
            this._separator = separator || ".";
        } else {
            return this._separator;
        }
    };

    // Constructs URLs from a route name, by replacing params.
    // Extra params may be appended to the query string.
    Shrinkroute.prototype.url = function( route, params, append ) {
        var query, fail;
        var path = getRoutePath( this._routes, route, this._separator );
        var used = [];

        append = append == null ? true : append;
        params = isObject( params ) ? params : {};

        // Start replacing Express style params
        path = path.replace( /:([\w]+)(\??)/g, function() {
            var empty;
            var name = arguments[ 1 ];
            var optional = arguments[ 2 ] === "?";

            // Determine if this param is empty
            empty = params[ name ] == null;

            // Push to the used params, so it'll not be used when appending to the query string.
            !empty && used.push( name );

            // Test to see if this route has failed - this is, it has not all required params.
            fail = fail || !optional && empty;

            // Optional and empty params will be replaced with ""
            return optional && empty ? "" : params[ name ];
        });

        // If the route has failed searching for params, let's return an empty string.
        if ( fail ) {
            return "";
        }

        // If the query string may receive extra params, let's do this!
        if ( append ) {
            path = url.parse( path );
            query = qs.parse( path.query );

            forEach( params, function( val, param ) {
                if ( used.indexOf( param ) > -1 ) {
                    // Don't reuse params in the query string
                    return;
                }

                query[ param ] = null ? "" : val;
            });

            // Create the query string...
            path.search = "?" + qs.stringify( query );

            // ...if it's only a ?, then we'll be better with no query string at all.
            path.search = path.search === "?" ? "" : path.search;

            return url.format( path );
        }

        return path;
    };

    module.exports = exports.Shrinkroute = Shrinkroute;
})( module, exports );