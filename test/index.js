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

    // separator suite
    // -----------------------------------------------------
    suite( "separator", function() {
        test( "should be created by default as '.'", function() {
            var shrinkr = shrinkroute();
            expect( shrinkr.separator() ).to.equal( "." );
        });

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

    // route suite
    // -----------------------------------------------------
    suite( "routes", function() {
        test( "should be created in Express app", function() {
            var spy = sinon.spy( this.app, "all" );
            var route = function() {};

            shrinkroute( this.app, {
               test: {
                   path: "/",
                   all: route
               }
            });

            expect( spy.calledOnce ).to.be.ok;
            expect( spy.args[ 0 ][ 0 ] ).to.equal( "/" );
            expect( spy.args[ 0 ][ 1 ] ).to.equal( route );
        });

        test( "should be created with nested paths", function() {
            // As we don't want to spy on the first route, we'll leave this to be instantiated later
            var spy;

            var shrinkr = shrinkroute( this.app, {
                users: {
                    path: "/users",
                    all: function() {}
                }
            });

            spy = sinon.spy( this.app, "all" );
            shrinkr.route({
                "users.list": {
                    path: "/list",
                    all: function() {}
                },
                "users.list.filtered": {
                    path: "/filtered",
                    all: function() {}
                }
            });

            expect( spy.callCount ).to.equal( 2 );
            expect( spy.args[ 0 ][ 0 ] ).to.equal( "/users/list" );
            expect( spy.args[ 1 ][ 0 ] ).to.equal( "/users/list/filtered" );
        });

        test( "should not be created if no app set", function() {
            var shrinkr = shrinkroute();
            shrinkr.route( "test", {
                path: "/",
                all: function() {}
            });

            // Upon creation, _routes will be undefined
            expect( shrinkr._routes ).to.be.undefined;
        });
    });

    // url building suite
    // -----------------------------------------------------
    suite( "URL building", function() {
        test( "[#1] inexistent routes should return empty url", function() {
            var shrinkr = shrinkroute( this.app );

            expect( shrinkr.url() ).to.equal( "" );
            expect( shrinkr.url( "users" ) ).to.equal( "" );
        });

        test( "return empty string on missing params", function() {
            var url;
            shrinkroute( this.app, {
                user: {
                    path: "/user/:id"
                }
            });

            url = this.app.shrinkroute.url( "user" );
            expect( url ).to.equal( "" );
        });

        test( "replace params", function() {
            var url;
            shrinkroute( this.app, {
                user: {
                    path: "/user/:id/:action/?query=:query"
                },
                article: {
                    path: "/article/:slug?"
                }
            });

            url = this.app.shrinkroute.url( "user", {
                id: 1,
                action: "edit",
                query: "123"
            });
            expect( url ).to.equal( "/user/1/edit/?query=123" );

            // Optional param passed
            url = this.app.shrinkroute.url( "article", {
                slug: "foobar"
            });
            expect( url ).to.equal( "/article/foobar" );

            // Optional param missing
            url = this.app.shrinkroute.url( "article" );
            expect( url ).to.equal( "/article/" );
        });

        test( "append or not extra params in the query string", function() {
            var url;
            var shrinkr = shrinkroute( this.app, {
                users: {
                    path: "/users"
                }
            });

            url = shrinkr.url( "users", {
                name: "foo",
                nickname: "bar"
            });
            expect( url ).to.equal( "/users?name=foo&nickname=bar" );

            url = shrinkr.url( "users", {
                name: "foo"
            }, false );
            expect( url ).to.equal( "/users" );
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