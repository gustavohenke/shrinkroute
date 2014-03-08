"use strict";

// Requires
var url = require( "url" );
var qs = require( "qs" );
var _ = require( "./util" );
var Route = require( "./route" );

// Module export
// -------------------------------------------------------------------------------------------------
module.exports = exports.Shrinkroute = exports.shrinkroute = Shrinkroute;

// Shrinkroute constructor
// -------------------------------------------------------------------------------------------------

/**
 * Constructs a new Shrinkroute instance.
 *
 * Uses John Resig style constructor:
 * http://ejohn.org/blog/simple-class-instantiation/
 *
 * @constructor
 * @param       {Object} [app]          The Express app to attach Shrinkroute to
 * @param       {Object} [routes]       Routes to set in the Express app
 * @param       {String} [separator]    The nested route separator to set
 * @returns     {Shrinkroute}
 */
function Shrinkroute( app, routes, separator ) {
    if ( this instanceof Shrinkroute ) {
        this.app( app );
        this.separator( separator || "." );
        this.route( routes );
    } else {
        return new Shrinkroute( app, routes, separator );
    }
}

// Shrinkroute prototype
// -------------------------------------------------------------------------------------------------

/**
 * Get or set the Shrinkroute Express app
 *
 * @since   0.1.0
 * @param   {Object} [app]          An Express app
 * @returns {Object|Shrinkroute}
 */
Shrinkroute.prototype.app = function( app ) {
    var matchReq, router;
    var self = this;

    if ( app != null ) {
        this._app = app;
        app.shrinkroute = this;

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

        // Make sure we're always above app.router
        moveMiddleware( app );

        return this;
    }

    // When no app is given, then the app is returned
    return this._app;
};

/**
 * Get or set the nested route separator for this Shrinkroute instance.
 *
 * @since   0.1.0
 * @param   {String} [separator="."]    The new separator for nested routes.
 * @returns {String|Shrinkroute}
 */
Shrinkroute.prototype.separator = function( separator ) {
    if ( separator ) {
        separator = typeof separator === "string" ? separator : this._separator;
        this._separator = separator || ".";
        return this;
    } else {
        return this._separator;
    }
};

/**
 * Get or set one or various routes.
 *
 * @since   0.1.0
 * @param   {String} [name]
 * @param   {String} [path]
 * @param   {Object} [handlersObj]
 * @returns {Object}
 */
Shrinkroute.prototype.route = function( name, path, handlersObj ) {
    var routeObj;
    var self = this;
    var app = this.app();

    // If it's a object, let's try to add every key as a route
    if ( _.isObject( name ) ) {
        _.forEach( name, function( route, name ) {
            self.route( name, route );
        });

        return this;
    }

    if ( !path ) {
        // No 2nd arg was given, so we must return something NOW!
        return name ? this._routes[ name ] : _.extend( {}, this._routes );
    } else if ( _.isObject( path ) ) {
        handlersObj = path;
        path = path.path;
    }

    // Ignore the route if no app is defined
    if ( app == null ) {
        return;
    }

    // If it's to set a route, and no path was specified, then it's error.
    if ( ( typeof path !== "string" || !path ) ) {
        if ( handlersObj ) {
            throw new Error( "Route path not given" );
        } else {
            return _.extend( {}, this._routes[ name ] );
        }
    }

    this._routes = this._routes || {};
    this._routes[ name ] = routeObj = new Route( this, name, path, handlersObj );

    _.forEach( routeObj.handler(), function( handler, method ) {
        if ( typeof app[ method ] === "function" ) {
            app[ method ]( routeObj.path( true ), handler );
        }
    });

    return this;
};

/**
 * Construct a route path, replacing every Express parameter (/bla/:param/..) and resolving parent
 * routes.
 *
 * @since   0.1.0
 * @param   {String} routeName      The route name
 * @param   {Object} [params]       Route parameters
 * @param   {Boolean} [append=true] Whether extra params should be appended to query string
 * @returns {String}                If the route exists and all of its required parameters were
 *                                  filled, returns the route path. Otherwise, returns an empty
 *                                  string.
 */
Shrinkroute.prototype.url = function( routeName, params, append ) {
    var fail, query, path;
    var used = [];

    try {
        path = this.route( routeName ).path( true );
    } catch ( e ) {
        // Route doesn't exist
        return "";
    }

    // If apppend wasn't passed, then it defaults to true
    append = append == null ? true : append;
    params = _.isObject( params ) ? params : {};

    path = path.replace( /:([\w]+)(\??)/g, function( match, name, optional ) {
        // Determine if this param is empty
        var empty = params[ name ] == null;

        // Is this param optional?
        optional = arguments[ 2 ] === "?";

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

        _.forEach( params, function( val, param ) {
            if ( used.indexOf( param ) > -1 ) {
                // Don't reuse params in the query string
                return;
            }

            query[ param ] = val == null ? "" : val;
        });

        // Create the query string
        path.search = qs.stringify( query );
    }

    return url.format( path );
};

/**
 * Construct a route path with scheme and host, replacing every Express parameter (/bla/:param/..)
 * and resolving parent routes.
 *
 * @since   0.2.0
 * @param   {Object|String} req     The request object or the requested url to get host info from
 * @param   {String} routeName      The route name
 * @param   {Object} [params]       Route parameters
 * @param   {Boolean} [append=true] Whether extra params should be appended to query string
 * @returns {String}                If the route exists and all of its required parameters were
 *                                  filled, returns the route path. Otherwise, returns an empty
 *                                  string.
 */
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

// Helpers
// -------------------------------------------------------------------------------------------------
function lookup( instance, route ) {
    var name;
    var routes = instance.route();

    for ( name in routes ) {
        // Compare full path with the Express matched path
        if ( routes[ name ].path( true ) === route.path ) {
            return name;
        }
    }

    // Otherwise return null (no route defined for this path)
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

function moveMiddleware( app ) {
    var shrinkr, router;
    var stack = app.stack;

    // Find our middleware in the stack
    shrinkr = _.find( stack, {
        handle: middleware
    });

    // Find router middleware in the stack
    // We can't use app.router or when setting routes it'll not be automatically added
    router = _.find( stack, {
        handle: app._router.middleware
    });

    if ( router ) {
        // Remove our middleware from the stack temporarily
        stack.splice( stack.indexOf( shrinkr ), 1 );

        // ...and then put it above the router middleware
        stack.splice( stack.indexOf( router ), 0, shrinkr );
    }
}