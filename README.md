# en-route [![NPM version](https://img.shields.io/npm/v/en-route.svg?style=flat)](https://www.npmjs.com/package/en-route) [![NPM monthly downloads](https://img.shields.io/npm/dm/en-route.svg?style=flat)](https://npmjs.org/package/en-route) [![NPM total downloads](https://img.shields.io/npm/dt/en-route.svg?style=flat)](https://npmjs.org/package/en-route) [![Linux Build Status](https://img.shields.io/travis/jonschlinkert/en-route.svg?style=flat&label=Travis)](https://travis-ci.org/jonschlinkert/en-route)

> Routing for static site generators, build systems and task runners, heavily based on express.js routes but works with file objects. Used by Assemble, Verb, and Template.

## Install

Install with [npm](https://www.npmjs.com/):

```sh
$ npm install --save en-route
```

## Thank you

This was highly inspired by express routes. Thank you, [TJ](https://github.com/tj). Our lives are easier because of your hard work.

Express is released under the MIT license.
The code that inspired this library was
Copyright (c) 2009-2014 TJ Holowaychuk [tj@vision-media.ca](mailto:tj@vision-media.ca).

## API

### [Layer](lib/layer.js#L23)

Create a new `Layer` with the given `path`, `options` and handler function.

**Params**

* `path` **{String}**
* `options` **{Object}**
* `handler` **{Function}**
* `returns` **{undefined}**

**Example**

```js
var layer = new Layer('/', function(file, next) {
  // do stuff to file
  next(null, file);
});
```

### [Route](lib/route.js#L19)

Initialize `Route` with the given `path`,

**Params**

* `path` **{String}**

**Example**

```js
var route = new Route('/', ['preRender', 'postRender']);
```

### [.dispatch](lib/route.js#L54)

Dispatch a middleware stack over the given `file`.

**Params**

* `file` **{Object}**: File object
* `returns` **{Function}**: Callback that exposes `err` and `file`

**Example**

```js
route.dispatch(file, function(err, res) {
  console.log(err, res);
});
```

### [.all](lib/route.js#L88)

Handler for all methods on the route.

**Params**

* `handler` **{Function}**
* `returns` **{Object}**: Route instance for chaining

**Example**

```js
route.all(function(file, next) {
  file.data.title = 'Home';
  next(null, file);
});
```

### [.handler](lib/route.js#L112)

Add a middleware handler method for the given `name` to the route instance.

**Params**

* `method` **{String}**: Name of the handler method to add to the `route` instance.

**Example**

```js
route.handler('before');
route.handler('after');
```

### [.handlers](lib/route.js#L129)

Add methods to the `route` instance for an array of middleware handlers.

**Params**

* `methods` **{Array}**: Method names to add to the `route` instance.

**Example**

```js
route.handlers(['before', 'after']);
```

### [.match](lib/route.js#L150)

Returns true if any layers in `route.stack` match the given `path`.

**Params**

* `path` **{String}**
* `returns` **{Boolean}**

**Example**

```js
console.log(route.match('foo/bar.js'));
//=> true or false
```

### [.layer](lib/route.js#L171)

Push a layer onto the stack for the given handler `method` and middleware `fn`.

**Params**

* `name` **{String}**: Layer name
* `fn` **{Function}**: Middleware function

**Example**

```js
route.layer('before', {}, function(){});
route.layer('after', {}, [function(){}, function(){}]);
route.layer('other', [function(){}, function(){}]);
```

### [Router](lib/router.js#L25)

Initialize a new `Router` with the given `methods`.

**Params**

* `options` **{Object}**
* `returns` **{Function}**: Returns a callable router function

**Example**

```js
var router = new Router({methods: ['preRender', 'postRender']});
```

### [.route](lib/router.js#L59)

Create a new Route for the given path. Each route contains a separate middleware stack.

**Params**

* `path` **{String}**
* `returns` **{Object}** `Route`: for chaining

**Example**

```js
var router = new Router();
router.route('/foo')
  .all(function(file, next) {
    file.contents = new Buffer('foo');
    next();
  });
```

### [.method](lib/router.js#L82)

Add additional methods to the current router instance.

**Params**

* `methods` **{String|Array}**: New methods to add to the router.
* `returns` **{Object}**: the router to enable chaining

**Example**

```js
var router = new Router();
router.method('post');
router.post('.hbs', function(file, next) {
  next();
});
```

### [.handler](lib/router.js#L100)

Add a middleware handler `method` to the instance.

**Params**

* `method` **{String}**: The name of the method to add
* `returns` **{Object}**: Returns the instance for chaining

**Example**

```js
router.handler('before');
router.handler('after');
```

### [.handlers](lib/router.js#L123)

Add an array of middleware handler `methods` to the instance.

**Params**

* `methods` **{Array}**: The method names to add
* `returns` **{Object}**: Returns the instance for chaining

**Example**

```js
router.handlers(['before', 'after']);
```

### [.handle](lib/router.js#L148)

Dispatch a file into the router.

**Params**

* `file` **{Object}**
* `callback` **{Function}**
* `returns` **{undefined}**

**Example**

```js
router.dispatch(file, function(err) {
  if (err) console.log(err);
});
```

### [.use](lib/router.js#L257)

Use the given middleware function, with optional path, defaulting to `/`. The other difference is that `route` path is stripped and not visible to the handler function. The main effect of this feature is that mounted handlers can operate without any code changes regardless of the `prefix` pathname.

**Params**

* `fn` **{Function}**: Middleware function
* `returns` **{Object}**: Router instance for chaining

**Example**

```js
var router = new Router();
router.use(function(file, next) {
  // do stuff to "file"
  next();
});
```

### [.param](lib/router.js#L320)

Map the given param placeholder `name`(s) to the given callback.

Parameter mapping is used to provide pre-conditions to routes
which use normalized placeholders. For example a `:user_id` parameter
could automatically load a user's information from the database without
any additional code,
The callback uses the same signature as middleware, the only difference
being that the value of the placeholder is passed, in this case the _id_

of the user. Once the `next()` function is invoked, just like middleware
it will continue on to execute the route, or subsequent parameter functions.

**Params**

* `name` **{String}**: Paramter name
* `fn` **{Function}**
* `returns` **{Object}**: Router instance for chaining

**Example**

```js
app.param('user_id', function(file, next, id) {
  User.find(id, function(err, user) {
    if (err) {
      return next(err);
    } else if (!user) {
      return next(new Error('failed to load user'));
    }
    file.user = user;
    next();
  });
});
```

## Release history

### v1.0.0

**Breaking changes**

* en-route no longer supports error middleware (middleware with three arguments). This was done to simplify debugging, eliminate code debt that makes en-route harder to maintain and improve, to make en-route and middleware run faster, and to make certain that errors are always passed to the final done function.

## About

### Related projects

You might also be interested in these projects:

* [assemble](https://www.npmjs.com/package/assemble): Get the rocks out of your socks! Assemble makes you fast at creating web projects… [more](https://github.com/assemble/assemble) | [homepage](https://github.com/assemble/assemble "Get the rocks out of your socks! Assemble makes you fast at creating web projects. Assemble is used by thousands of projects for rapid prototyping, creating themes, scaffolds, boilerplates, e-books, UI components, API documentation, blogs, building websit")
* [base-routes](https://www.npmjs.com/package/base-routes): Plugin for adding routes support to your `base` application. Requires templates support to work. | [homepage](https://github.com/node-base/base-routes "Plugin for adding routes support to your `base` application. Requires templates support to work.")
* [base](https://www.npmjs.com/package/base): Framework for rapidly creating high quality node.js applications, using plugins like building blocks | [homepage](https://github.com/node-base/base "Framework for rapidly creating high quality node.js applications, using plugins like building blocks")
* [gulp-routes](https://www.npmjs.com/package/gulp-routes): Add middleware to run for specified routes in your gulp pipeline. | [homepage](https://github.com/assemble/gulp-routes "Add middleware to run for specified routes in your gulp pipeline.")

### Contributing

Pull requests and stars are always welcome. For bugs and feature requests, [please create an issue](../../issues/new).

### Contributors

| **Commits** | **Contributor** | 
| --- | --- |
| 68 | [jonschlinkert](https://github.com/jonschlinkert) |
| 35 | [doowb](https://github.com/doowb) |

### Building docs

_(This project's readme.md is generated by [verb](https://github.com/verbose/verb-generate-readme), please don't edit the readme directly. Any changes to the readme must be made in the [.verb.md](.verb.md) readme template.)_

To generate the readme, run the following command:

```sh
$ npm install -g verbose/verb#dev verb-generate-readme && verb
```

### Running tests

Running and reviewing unit tests is a great way to get familiarized with a library and its API. You can install dependencies and run tests with the following command:

```sh
$ npm install && npm test
```

### Author

**Brian Woodward**

* [github/doowb](https://github.com/doowb)
* [twitter/jonschlinkert](https://twitter.com/jonschlinkert)

**Jon Schlinkert**

* [github/jonschlinkert](https://github.com/jonschlinkert)
* [twitter/jonschlinkert](https://twitter.com/jonschlinkert)

### License

Copyright © 2017, [Jon Schlinkert](http://twitter.com/jonschlinkert).
Released under the [MIT License](LICENSE).

***

_This file was generated by [verb-generate-readme](https://github.com/verbose/verb-generate-readme), v0.6.0, on August 07, 2017._