"use strict";

module.exports = exports = {};

// Give extend module in the exports also
exports.extend = require( "extend" );

// Detects whether we're dealing with an plain object
exports.isObject = function isObject( obj ) {
    return Object.prototype.toString.call( obj ) === "[object Object]";
};

// Loop thru each key/value pair in a object, with an optional context
exports.forEach = function forEach( obj, fn, context ) {
    return Object.keys( obj ).forEach(function( key ) {
        fn.call( context, obj[ key ], key, obj );
    });
};

// Find the first ocurrence of some partial match in an array
exports.find = function find( array, match ) {
    var i, len, key;

    if ( !Array.isArray( array ) ) {
        return;
    }

    array:
    for ( i = 0, len = array.length; i < len; i++ ) {
        for ( key in match ) {
            if ( array[ i ][ key ] !== match[ key ] ) {
                continue array;
            }
        }

        return array[ i ];
    }
};