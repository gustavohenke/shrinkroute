"use strict";

var url = require( "url" );
var qs = require( "qs" );
var _ = require( "./util" );

module.exports = function Route( shrinkr, name, path, handlers ) {
    var self = this;
    var separator = shrinkr.separator();

    handlers = handlers || {};
    path = url.parse( path );
    name = ( name || "" );

    // If 'path' came in the handlers object, we delete it, because it's not used by us
    delete handlers.path;

    /**
     * Get the route name
     *
     * @since   0.3.0
     * @returns {String}
     */
    this.name = function() {
        return name;
    };

    /**
     * Get the route path.
     * Parent route resolutions depend on the full param.
     *
     * @since   0.3.0
     * @param   {Boolean} [full=false]
     * @returns {String}
     */
    this.path = function( full ) {
        var parent, query;

        // If the full path is not required, just return the plain path as defined.
        if ( !full ) {
            return path.path;
        }

        // Store the current query string for later usage
        query = qs.parse( path.query );

        // Discover the parent route
        parent = self.name().split( separator ).slice( 0, -1 );

        // Do we have a parent?
        if ( parent.length ) {
            // Yes: get it
            parent = shrinkr.route( parent.join( separator ) );

            // If the parent route doesn't exists, we'll cascade an error
            if ( !parent ) {
                throw new Error( "Parent route not found for " + name );
            }
        } else {
            // We don't have anything else to do, because we've reached the topmost route
            return path.path;
        }

        // Parse the parent full path
        parent = url.parse( parent.path( true ) );

        // Base the query string in the parent route defined query + our query
        query = _.extend( qs.parse( parent.query ), query );

        // Build the path all again
        return url.format({
            pathname: parent.pathname + path.pathname,
            search: qs.stringify( query )
        });
    };

    /**
     * Get one method handler or all handlers for this route.
     *
     * @since   0.3.0
     * @param   {String} [method]
     * @returns {*}
     */
    this.handler = function( method ) {
        return method ? handlers[ method ] : handlers;
    };
};