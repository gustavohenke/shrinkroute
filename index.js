var dir = process.env.SHRINKR_COV ? "./src-cov" : "./src";
module.exports = require( dir + "/shrinkroute" );