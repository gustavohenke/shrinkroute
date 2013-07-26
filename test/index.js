suite( "Shrinkroute", function() {
    "use strict";

    var sinon = require( "sinon" );
    var expect = require( "chai" ).expect;
    var shrinkroute = require( ".." );
    var express = require( "express" );

    setup(function() {
        this.app = express();
    });

    teardown(function() {
        delete this.app;
    });

    // .app() suite
    // -----------------------------------------------------
    suite( ".app()", function() {
        test( "set and decorate the new app", function() {
            var shrinkr = shrinkroute();

            // Must return itself
            expect( shrinkr.app( this.app ) ).to.equal( shrinkr );

            // Set the shrinkroute in the app
            expect( this.app ).to.have.property( "shrinkroute" );

            // Holds a backup of the app route dispatcher
            expect( shrinkr._dispatcher ).to.not.equal( this.app._router._dispatch );
        });

        test( "get the current app", function() {
            var shrinkr = shrinkroute();
            expect( shrinkr.app() ).to.be.undefined;

            shrinkr.app( this.app );
            expect( shrinkr.app() ).to.equal( this.app );
        });
    });

    // .separator() suite
    // -----------------------------------------------------
    suite( ".separator()", function() {
        test( "set the new separator", function() {
            var shrinkr = shrinkroute();

            shrinkr.separator( "/" );
            expect( shrinkr._separator ).to.equal( "/" );

            // Cannot override existing separator if not string
            shrinkr.separator({});
            expect( shrinkr._separator ).to.equal( "/" );

            shrinkr.separator([]);
            expect( shrinkr._separator ).to.equal( "/" );
        });

        test( "get the current separator", function() {
            var shrinkr = shrinkroute( this.app, {}, "/" );
            var sep = shrinkr.separator();

            expect( sep ).to.equal( "/" );
        });
    });

    // general functionality tests
    // -----------------------------------------------------
    test( "uses John Resig style constructors", function() {
        var shrinkr = shrinkroute( this.app );
        expect( shrinkr ).to.be.an.instanceOf( shrinkroute );
    });

    test( "gives local 'url'", function() {
        var oldLocal = this.app.locals.url;

        shrinkroute( this.app, {} );
        expect( this.app.locals.url ).to.be.a( "function" )
                                     .and.to.not.equal( oldLocal );
    });

    test( "gives request 'buildUrl'", function() {
        var req, spy;

        shrinkroute( this.app, {} );
        spy = sinon.spy( this.app._router, "_dispatch" );

        // We wrap this in try..catch because we don't care about Express exceptions
        try {
            spy({}, {}, function() {});
        } catch ( e ) {}

        req = spy.args[ 0 ][ 0 ];
        expect( req ).to.have.property( "buildUrl" );
    });

});