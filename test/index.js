suite( "Shrinkroute", function() {
    "use strict";

    var expect = require( "chai" ).expect;
    var shrinkroute = require( ".." );
    var express = require( "express" );

    setup(function() {
        this.app = express();
    });

    test( "doesn't go further if routes is not object", function() {
        expect( shrinkroute( this.app, null ) ).to.be.false;
        expect( shrinkroute( this.app, 123 ) ).to.be.false;
        expect( shrinkroute( this.app, true ) ).to.be.false;
        expect( shrinkroute( this.app, [] ) ).to.be.false;
        expect( shrinkroute( this.app, "" ) ).to.be.false;
        expect( shrinkroute( this.app ) ).to.be.false;
    });

    test( "gives URL helper", function() {
        var oldLocal = this.app.locals.url;
        var oldFn = this.app._router._dispatch;

        shrinkroute( this.app, {} );

        expect( this.app.locals.url ).to.be.a( "function" )
                                     .and.to.not.equal( oldLocal );

        expect( this.app._router._dispatch ).to.be.a( "function" )
                                            .and.to.not.equal( oldFn );
    });
});