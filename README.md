# Shrinkroute [![Build Status](https://travis-ci.org/gustavohenke/shrinkroute.png)](https://travis-ci.org/gustavohenke/shrinkroute) [![NPM version](https://badge.fury.io/js/shrinkroute.png)](http://badge.fury.io/js/shrinkroute)

Named routes for Express. Helps you in achieving DRY routes!

## Usage

See below to understand how simple is to use Shrinkroute:

```javascript
var app = express();
var shrinkroute = require( "shrinkroute" );
var routes = {
    home: {
        path: "/",
        all: function( req, res, next ) {
            res.send( "Hello World!" );
        }
    },
    user: {
        path: "/user/:userId?",
        // Showing/listing a user doesn't require authentication
        get: routes.user.show,

        // Creating/updating a user does require authentication!
        post: [ routes.requireAuthentication, routes.createUser ],
        put: [ routes.requireAuthentication, routes.updateUser ]
    }
};

shrinkroute( app, routes );
```

Doing this will give the possibility of building a URL from the route or from the view.
Will be given to you `req.buildUrl()` and a local called `url()`, which are the same;
They'll replace the parameters in your route and append undefined parameters in the generated URL's query string.
For example:

```javascript
routes.createUser = function( req, res, next ) {
    User.create(..., function( err, id ) {
        // If the created user id is 123, then will redirect you to /user/123
        res.redirect( req.buildUrl( "user", { userId: id }) );
    });
};
```

```html
<!-- Some form around, we will send it to the "user" (/user url) route: -->
<form method="post" action="<%= url( "user" ) %>">
    ...
</form>

<!--
If you'd like to use some undefined params, you're free to do so!
The generated URL below will be /user?order=posts
-->
<a href="<%= url( "user", { order: "posts" }) %>">List users by posts</a>
```

## Installation

Install Shrinkroute via NPM:

```shell
npm install shrinkroute
```

## Testing

Shrinkroute is tested with [Mocha](http://visionmedia.github.io/mocha). Inside the project root, run:

```shell
npm install -d
npm test
```

This will do the job for you!