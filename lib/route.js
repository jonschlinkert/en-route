'use strict';

/**
 * Module dependencies.
 */

var debug = require('debug')('router:route');
var slice = require('array-slice');
var flatten = require('arr-flatten');
var Layer = require('./layer');

/**
 * Expose `Route`.
 */

module.exports = Route;

/**
 * Initialize `Route` with the given `path`,
 *
 * @param {String} path
 * @api private
 */

function Route(path, methods) {
  debug('new %s', path);
  this.path = path;
  this.stack = [];
  this.methods = {};
  decorate(this, methods || []);
}

/**
 * Determines if this Route can handle the given method
 *
 * @param {String} `method` method to check
 * @return {Boolean} True if this Route handles the given method
 * @api private
 */

Route.prototype.handlesMethod = function handlesMethod(method) {
  if (this.methods._all) {
    return true;
  }
  method = method && method.toLowerCase();
  return Boolean(this.methods[method]);
};

/**
 * dispatch file into this route
 *
 * @api private
 */

Route.prototype.dispatch = function dispatch(file, done) {
  var idx = 0;
  var stack = this.stack;
  if (stack.length === 0) {
    return done();
  }

  file.options = file.options || {};
  var method = file.options.method && file.options.method.toLowerCase();
  file.options.route = this;
  next();

  function next(err) {
    if (err && err === 'route') {
      return done();
    }

    var layer = stack[idx++];
    if (!layer) {
      return done(err);
    }

    if (layer.method && layer.method !== method) {
      return next(err);
    }

    if (err) {
      layer.handleError(err, file, next);
    } else {
      layer.handleFile(file, next);
    }
  }
};

/**
 * Add a handler for all methods to this route.
 *
 * Behaves just like middleware and can respond or call `next`
 * to continue processing.
 *
 * You can use multiple `.all` call to add multiple handlers.
 *
 *   function checkSomething(file, next) {
 *     next();
 *   };
 *
 *   function validateUser(file, next) {
 *     next();
 *   };
 *
 *   route
 *     .all(validateUser)
 *     .all(checkSomething)
 *     .get(function(file, next) {
 *       file.data.message = "Hello, World!";
 *     });
 *
 * @param {function} handler
 * @return {Route} for chaining
 * @api public
 */

Route.prototype.all = function all() {
  var callbacks = flatten(slice(arguments));

  callbacks.forEach(function(fn) {
    if (typeof fn !== 'function') {
      var type = {}.toString.call(fn);
      var msg = 'Route.all() requires callback functions but got a ' + type;
      throw new Error(msg);
    }
    var layer = Layer('/', {}, fn);
    layer.method = undefined;
    this.methods._all = true;
    this.stack.push(layer);
  }, this);
  return this;
};

/**
 * Decorate the `route` with the given methods to provide middleware
 * for the route.
 *
 * @param  {Object} `route` Route instance to add methods to.
 * @param  {Array} `methods` Methods to add to the `route`
 * @api private
 */

function decorate(route, methods) {
  methods.forEach(function (method) {
    route[method] = function () {
      var callbacks = flatten(slice(arguments));
      callbacks.forEach(function (fn) {
        if (typeof fn !== 'function') {
          var type = {}.toString.call(fn);
          var msg = 'route.' + method + '() requires callback functions but got a ' + type;
          throw new Error(msg);
        }
        method = method && method.toLowerCase();
        debug('%s %s', method, this.path);
        var layer = new Layer('/', {}, fn);
        layer.method = method;
        this.methods[method] = true;
        this.stack.push(layer);
      }, this);
      return this;
    };
  });
}
