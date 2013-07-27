# Shrinkroute [![Build Status](https://travis-ci.org/gustavohenke/shrinkroute.png)](https://travis-ci.org/gustavohenke/shrinkroute) [![NPM version](https://badge.fury.io/js/shrinkroute.png)](http://badge.fury.io/js/shrinkroute)

Named and nested routes for Express. Helps you in achieving DRY routes!

Easy as that:
```javascript
shrinkroute( app, {
    "user": {
        path: "/user/:id?",
        get: showOrListUsers,
        post: [ requireAuthentication, createUser ],
        put: [ requireAuthentication, updateUser ]
    }
});

// in your routes...
function createUser( req, res, next ) {
    User.create(..., function( err, userId ) {
        res.redirect( req.buildUrl("user", { id: userId ) );
    });
}

// or views...
<a href="<%= url( "user", { id: 1 }) %>">User profile</a>
```

## Nested routes

Nested routes are separated by an character, which is by default `.` (you may customize it if you want). When you set nested routes, they'll inherit their parent's route.
For example:

```javascript
shrinkroute( app, {
    "admin": {
        path: "/admin"
    },
    "admin.users": {
        path: "/users"
    }
});
```

This will end up in a route named `admin` which map to `/admin`, and another route named `admin.users` which map to `/admin/users`.

## Installation

Install Shrinkroute via NPM:

```shell
npm install shrinkroute
```

## API

### `[new] shrinkroute( [app][, routes][, separator = "."] )`
Returns a new instance of Shrinkroute. This is a shortcut for the following:

```javascript
var shrinkr = shrinkroute();
shrinkr.app( app );
shrinkr.routes( routes );
shrinkr.separator( separator );
```

### `.app( [app] )`
Get or set the app of this Shrinkroute instance.
If setting the app, the following things will be available from now on:

* `app.shrinkroute` - the Shrinkroute instance
* `app.locals.url` - the Shrinkroute URL builder. Will be automatically available to all of your views.
* `req.buildUrl` - the Shrinkroute URL builder, available only inside a route.

### `.route( name[, route])`
Get or set a route by its name.

### `.route( [routes] )`
Get or set all routes at once.

### `.separator( [separator] )`
Get or set the routes namespace separator. Useful for when using nested routes.

### `.url( [name][, params][, append] )`
Build the URL for a route. If the route path has parameters in the Express style (`:param`), they must be passed as a object in the `params` argument:

```javascript
shrinkr.url( "user", {
    id: 1
});
```

If they're not passed, the returned URL will be blank. However, if you mark it as optional (`:param?`), it'll not be required.

Parameters passed in the `params` object that are not defined in the route will be appended to the query string, unless the `append` argument is falsy.

```javascript
shrinkr.url( "users", {
    name: "foo"
});

// => /users?name=foo

shrinkr.url( "users", {
    name: "foo"
}, false);

// => /users
```

## Testing

Shrinkroute is tested with [Mocha](http://visionmedia.github.io/mocha). Inside the project root, run:

```shell
npm install -d
npm test
```

This will do the job for you!