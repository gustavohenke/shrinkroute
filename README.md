# Shrinkroute [![Build Status](https://travis-ci.org/gustavohenke/shrinkroute.png)](https://travis-ci.org/gustavohenke/shrinkroute) [![NPM version](https://badge.fury.io/js/shrinkroute.png)](http://badge.fury.io/js/shrinkroute) [![Dependency Status](https://gemnasium.com/gustavohenke/shrinkroute.png)](https://gemnasium.com/gustavohenke/shrinkroute)

Named and nested routes for Express 3+, with URL building support. Helps you in achieving DRY routes!

Easy as that:
```javascript
var shrinkr = shrinkroute( app, {
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
        // redirects to /user/1 (or any other userId...)
        res.redirect( req.buildUrl( "user", { id: userId } ) );

        // if full URLs are needed, try below - redirects to http://foobar.com/user/1
        res.redirect( req.buildFullUrl( "user", { id: userId } ) );
    });
}

// or views...
<a href="<%= url( "user", { id: 1 }) %>">User profile</a>
<a href="<%= fullUrl( "user", { id: 1 }) %>">User profile</a>
```

__ATTENTION:__ Version 0.3.0 automatically adds the middleware responsible for providing URL builders in the view. When upgrading from previous versions, remove `app.use( shrinkr.middleware );` line.

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


## URL Builders in the view and in the request
The following functions are automatically available to you in every route _set by Shrinkroute_:
* `req.buildUrl` and `res.locals.url` - builds paths for a route. The same as using `shrinkr.url()`.
* `req.buildFullUrl` and `res.locals.fullUrl` - builds full URLs for a route. The same as using `shrinkr.fullUrl()`.

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
* `req.route.name` - the name of the matched route

### `.route( name[, route] )`
Get or set a route by its name. When setting the route, the route path must be passed as `route.path`.

### `.route( name, path, route )`
Set a route.

### `.route( [routes] )`
Get all routes or set various routes at once.

### `.separator( [separator] )`
Get or set the routes namespace separator. Useful for when using nested routes.

### `.url( name[, params][, append] )`
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

### `.fullUrl( name[, params][, append] )`
Builds full URLs for a given route that include protocol, host and port. Respects the same rules as `.url()`.

```javascript
req.buildFullUrl( "users", {
  name: "foo"
});

// => http://foobar.com/users?name=foo
```

## Testing

Shrinkroute is tested with [Mocha](http://visionmedia.github.io/mocha). Inside the project root, run:

```shell
npm install
npm test
```

This will do the job for you!

## License
MIT
