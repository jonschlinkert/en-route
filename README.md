# en-route [![NPM version](https://img.shields.io/npm/v/en-route.svg?style=flat)](https://www.npmjs.com/package/en-route) [![NPM monthly downloads](https://img.shields.io/npm/dm/en-route.svg?style=flat)](https://npmjs.org/package/en-route) [![NPM total downloads](https://img.shields.io/npm/dt/en-route.svg?style=flat)](https://npmjs.org/package/en-route) [![Linux Build Status](https://img.shields.io/travis/jonschlinkert/en-route.svg?style=flat&label=Travis)](https://travis-ci.org/jonschlinkert/en-route)

> Routing for static site generators, build systems and task runners, heavily based on express.js routes but works with file objects. Used by Assemble, Verb, and Template.

Please consider following this project's author, [Jon Schlinkert](https://github.com/jonschlinkert), and consider starring the project to show your :heart: and support.

## Install

Install with [npm](https://www.npmjs.com/):

```sh
$ npm install --save en-route
```

## How it works

en-route is a different, but similar concept to routes you might be familiar with, like express routes. The general idea is, you can:

1. Use middleware to modify file objects
2. Define routes, to determine whether or not a middleware function should run on a given file.
3. Define [handlers](#handlers) for running specific middleware at specific points in your application or build.

See the [examples folder](./examples) for a number of different examples of how en-route works.

## Usage

```js
const Router = require('en-route');
const router = new Router();
```

## API

### [Router](lib/router.js#L20)

Create a new `Router` with the given options.

**Params**

* `options` **{object}**

**Example**

```js
// initialize a router with handler methdods
const router = new Router({ handlers: ['preWrite', 'postWrite'] });
```

### [.handlers](lib/router.js#L49)

Register one or more middleware handler methods. Handler methods may also be added by passing an array of handler names to the constructor on the `handlers` option.

**Params**

* `methods` **{string}**: Method names
* `options` **{object}**
* `returns` **{object}**: Returns the instance for chaining.

**Example**

```js
router.handlers(['onLoad', 'preRender']);
```

### [.handler](lib/router.js#L67)

Register a middleware handler method.

**Params**

* `method` **{string}**: Method name
* `options` **{object}**
* `returns` **{object}**: Returns the instance for chaining.

**Example**

```js
router.handler('onLoad');
```

### [.route](lib/router.js#L124)

Create a new router instance with all handler methods bound to the given pattern.

**Params**

* `pattern` **{string}**
* `options` **{object}**: Options to pass to new router.
* `returns` **{object}**: Returns a new router instance with handler methods bound to the given pattern.

**Example**

```js
const router = new Router({ handlers: ['before', 'after'] });
const file = { path: '/foo', content: '' };

router.route('/foo')
  .before(function(file) {
    file.content += 'foo';
  })
  .after(function(file) {
    file.content += 'bar';
  });

router.handle(file)
  .then(() => {
    assert.equal(file.content, 'foobar');
  });
```

### [.handle](lib/router.js#L158)

Run a middleware methods on the given `file`.

**Params**

* `method` **{string|file}**: The handler method to call on `file`. If the first argument is a file object, all handlers will be called on the file.
* `file` **{object}**: File object
* `returns` **{Promise}**

**Example**

```js
// run a specific method
router.handle('onLoad', file)
  .then(file => console.log('File:', file))
  .catch(console.error);

// run multiple methods
router.handle('onLoad', file)
  .then(file => router.handle('preRender', file))
  .catch(console.error);

// run all methods
router.handle(file)
  .then(file => console.log('File:', file))
  .catch(console.error);
```

### [.all](lib/router.js#L191)

Runs all handler methods on the given file, in series.

**Params**

* `file` **{object}**: File object
* `returns` **{Promise}**

**Example**

```js
router.all(file => {
  file.data.title = 'Home';
});
```

### [.mixin](lib/router.js#L222)

Mix router methods onto the given object.

**Params**

* `target` **{object}**
* `returns` **{undefined}**

**Example**

```js
const router = new Router();
const obj = {};
router.handlers(['before', 'after']);
router.mixin(obj);
console.log(obj.before) //=> [function]
```

### [Route](lib/route.js#L28)

Create a new `Route` with the given pattern, handler functions and options.

**Params**

* `pattern` **{string|regex}**
* `fns` **{function|array}**: One or more middleware functions.
* `options` **{object}**

**Example**

```js
const fn = file => file.count++;
const Route = require('en-route').Route;
const route = new Route('/(.*)', [fn, fn, fn]);
const file = { path: '/foo', count: 0 };

route.handle(file)
  .then(file => {
    console.log(file.count); // 3
  });
```

### [.all](lib/route.js#L60)

Register one or more handler functions to be called on all layers on the route.

**Params**

* `fns` **{function|array}**: Handler function or array of handler functions.
* `returns` **{object}**: Route instance for chaining

**Example**

```js
route.all(function(file) {
  file.data.title = 'Home';
});
route.all([
  function(file) {},
  function(file) {}
]);
```

### [.handle](lib/route.js#L79)

Run a middleware stack on the given `file`.

**Params**

* `file` **{object}**: File object
* `returns` **{object}**: Callback that exposes `err` and `file`
* `returns` **{object}**: Returns a promise with the file object.

**Example**

```js
route.handle(file)
  .then(file => console.log('File:', file))
  .catch(console.error);
```

### [.layer](lib/route.js#L115)

Push a layer onto the stack for a middleware functions.

**Params**

* `pattern` **{string|regex}**: The pattern to use for matching files to determin if they should be handled.
* `fn` **{function|array}**: Middleware functions
* `returns` **{object}**: Route instance for chaining

**Example**

```js
route.layer(/foo/, file => {
  // do stuff to file
  file.layout = 'default';
});
```

### [.layers](lib/route.js#L134)

Push a layer onto the stack for one or more middleware functions.

**Params**

* `pattern` **{string|regex}**
* `fns` **{function|array}**: One or more middleware functions
* `returns` **{object}**: Route instance for chaining

**Example**

```js
route.layers(/foo/, function);
route.layers(/bar/, [function, function]);
```

### [Layer](lib/layer.js#L22)

Create a new `Layer` with the given `pattern`, handler function and options.

**Params**

* `pattern` **{string}**
* `handler` **{function}**
* `options` **{object}**

**Example**

```js
const layer = new Layer('/', file => {
  // do stuff to file
  file.extname = '.html';
});
```

### [.handle](lib/layer.js#L57)

Calls the layer handler on the given file if the `file.path` matches the layer pattern.

**Params**

* `file` **{object}**: File object
* `returns` **{Promise}**

**Example**

```js
layer.handle(file)
  .then(() => console.log('Done:', file))
  .then(console.error)
```

### [.match](lib/layer.js#L77)

Attempts to match a file path with the layer pattern. If the path matches, an object of params is returned (see [path-to-regexp](https://github.com/pillarjs/path-to-regexp) for details), otherwise `null` is returned.

**Params**

* `filepath` **{string}**
* `returns` **{object|null}**

**Example**

```js
const layer = new Layer('/:name');
console.log(layer.match('/foo')) //=> { name: 'foo' }
```

## Release history

### v2.0.0

**Breaking changes**

* en-route was completely refactored from the ground-up.

### v1.0.0

**Breaking changes**

* en-route no longer supports error middleware (middleware with three arguments). This was done to simplify debugging, eliminate code debt that makes en-route harder to maintain and improve, to make en-route and middleware run faster, and to make certain that errors are always passed to the final done function.

## About

<details>
<summary><strong>Contributing</strong></summary>

Pull requests and stars are always welcome. For bugs and feature requests, [please create an issue](../../issues/new).

</details>

<details>
<summary><strong>Running Tests</strong></summary>

Running and reviewing unit tests is a great way to get familiarized with a library and its API. You can install dependencies and run tests with the following command:

```sh
$ npm install && npm test
```

</details>

<details>
<summary><strong>Building docs</strong></summary>

_(This project's readme.md is generated by [verb](https://github.com/verbose/verb-generate-readme), please don't edit the readme directly. Any changes to the readme must be made in the [.verb.md](.verb.md) readme template.)_

To generate the readme, run the following command:

```sh
$ npm install -g verbose/verb#dev verb-generate-readme && verb
```

</details>

### Related projects

You might also be interested in these projects:

* [assemble](https://www.npmjs.com/package/assemble): Get the rocks out of your socks! Assemble makes you fast at creating web projects… [more](https://github.com/assemble/assemble) | [homepage](https://github.com/assemble/assemble "Get the rocks out of your socks! Assemble makes you fast at creating web projects. Assemble is used by thousands of projects for rapid prototyping, creating themes, scaffolds, boilerplates, e-books, UI components, API documentation, blogs, building websit")
* [base-routes](https://www.npmjs.com/package/base-routes): Plugin for adding routes support to your `base` application. Requires templates support to work. | [homepage](https://github.com/node-base/base-routes "Plugin for adding routes support to your `base` application. Requires templates support to work.")
* [base](https://www.npmjs.com/package/base): Framework for rapidly creating high quality, server-side node.js applications, using plugins like building blocks | [homepage](https://github.com/node-base/base "Framework for rapidly creating high quality, server-side node.js applications, using plugins like building blocks")
* [gulp-routes](https://www.npmjs.com/package/gulp-routes): Add middleware to run for specified routes in your gulp pipeline. | [homepage](https://github.com/assemble/gulp-routes "Add middleware to run for specified routes in your gulp pipeline.")

### Contributors

| **Commits** | **Contributor** | 
| --- | --- |
| 94 | [jonschlinkert](https://github.com/jonschlinkert) |
| 35 | [doowb](https://github.com/doowb) |

### Author

**Brian Woodward**

* [LinkedIn Profile](https://linkedin.com/in/jonschlinkert)
* [GitHub Profile](https://github.com/doowb)
* [Twitter Profile](https://twitter.com/jonschlinkert)

**Jon Schlinkert**

* [LinkedIn Profile](https://linkedin.com/in/jonschlinkert)
* [GitHub Profile](https://github.com/jonschlinkert)
* [Twitter Profile](https://twitter.com/jonschlinkert)

### License

Copyright © 2018, [Jon Schlinkert](http://twitter.com/jonschlinkert).
Released under the [MIT License](LICENSE).

***

_This file was generated by [verb-generate-readme](https://github.com/verbose/verb-generate-readme), v0.6.0, on May 12, 2018._