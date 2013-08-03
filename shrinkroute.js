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

    // Lookup all routes until one with the same path of a request is found
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

    // Shrinkroute constructor
    // ------------------------------------------------------------

    // John Resig style constructors!
    function Shrinkroute( app, routes, separator ) {
        if ( this instanceof Shrinkroute ) {
            // Force the context to be always this, so no problems when using the middleware!
            this.middleware = this.middleware.bind( this );

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
        var matchRequest;
        var self = this;

        if ( app != null ) {
            app.shrinkroute = this;
            this._app = app;

            matchRequest = app._router.matchRequest;
            app._router.matchRequest = function() {
                var route = matchRequest.apply( this, arguments );
                if ( route ) {
                    // Try to lookup the name of the route
                    route.name = lookup( self, route );
                }

                return route;
            };

            return this;
        }

        return this._app;
    };

    // Shrinkroute middleware.
    // Simply gives our useful URL builders.
    Shrinkroute.prototype.middleware = function( req, res, next ) {
        var urlBuilder = this.url.bind( this );
        var fullUrlBuilder = this.fullUrl.bind( this, req );

        // Give locals and request patches
        req.buildUrl = urlBuilder;
        res.locals.url = urlBuilder;

        req.buildFullUrl = fullUrlBuilder;
        res.locals.fullUrl = fullUrlBuilder;

        next();
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

    // Constructs a full URL, with host and port.
    // This will call Shrinkroute.url() internally, so it accept the same args
    Shrinkroute.prototype.fullUrl = function( req, route, params, append ) {
        var hostUrl;
        var path = this.url( route, params, append );
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

    module.exports = exports.Shrinkroute = Shrinkroute;
})( module, exports );