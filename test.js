var mocha = new ( require( "mocha" ) )({
    ui: "tdd",
    reporter: "list"
});

mocha.addFile( "test/index.js" );
mocha.run();