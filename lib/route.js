'use strict';

/**
 * Module dependencies
 */

var debug = require('debug')('en-route:route');
var each = require('async-each-series');
var typeOf = require('typeof-article');
var flatten = require('arr-flatten');
var isObject = require('isobject');

/**
 * Local dependencies
 */

var Layer = require('./layer');
var utils = require('./utils');

/**
 * Initialize `Route` with the given `path`,
 *
 * @param {String} path
 * @api private
 */

function Route(path, methods) {
  debug('initializing route %s, from <%s>', path, __filename);
  this.methods = {};
  this.stack = [];
  this.path = path;
  this.handlers(methods);
}

/**
 * Determines if this Route can handle the given method
 *
 * @param {String} `method` method to check
 * @return {Boolean} True if this Route handles the given method
 * @api private
 */

Route.prototype.hasHandler = function(method) {
  if (this.methods.all === true) {
    return true;
  }
  if (typeof method !== 'string') {
    throw new TypeError(expected('string', method));
  }
  var key = method.toLowerCase();
  return this.methods.hasOwnProperty(key);
};

/**
 * dispatch file into this route
 *
 * @api private
 */

Route.prototype.dispatch = function dispatch(file, cb) {
  var stack = this.stack;
  var index = 0;

  if (stack.length === 0) {
    cb();
    return;
  }

  file.options = file.options || {};
  file.options.route = this;

  var method = file.options.method && file.options.method.toLowerCase();

  file.options = file.options || {};
  file.options.method = file.options.method || 'all';
  file.options.route = this;

  // var method = file.options.method.toLowerCase();

  // each(stack, function(layer, next) {
  //   if (!layer || (layer.method && layer.method !== method)) {
  //     next();
  //     return;
  //   }
  //   console.log(layer.handle)
  //   next();
  // }, cb);

  (function next(err) {
    if (err && err === 'route') {
      cb();
      return;
    }

    var layer = stack[index++];
    if (!layer) {
      cb(err);
      return;
    }

    if (layer.method && layer.method !== method) {
      next(err);
      return;
    }

    if (err) {
      layer.handleError(err, file, next);
    } else {
      layer.handleFile(file, next);
    }
  })();
};

/**
 * Add a handler for all methods to this route.
 *
 * Behaves just like middleware and can respond or call `next`
 * to continue processing.
 *
 * You can use multiple `.all` call to add multiple handlers.
 *
 * ```js
 * function checkSomething(file, next) {
 *   next();
 * };
 *
 * function validateUser(file, next) {
 *   next();
 * };
 *
 * route
 *   .all(validateUser)
 *   .all(checkSomething)
 *   .get(function(file, next) {
 *     file.data.message = "Hello, World!";
 *   });
 * ```
 *
 * @param {Function} `handler`
 * @return {Object} `Route` for chaining
 * @api public
 */

Route.prototype.all = function all(options) {
  var offset = 0;

  if (isObject(options)) {
    offset = 1;
  } else {
    options = {};
  }

  var handlers = flatten([].slice.call(arguments, offset));
  for (var i = 0; i < handlers.length; i++) {
    this.layer('all', options, handlers[i]);
  }
  return this;
};

/**
 * Add a middleware handler method for the given `name` to the
 * route instance.
 *
 * ```js
 * route.handler('before');
 * route.handler('after');
 * ```
 * @param {String} `method` Name of the handler method to add to the `route` instance.
 * @api public
 */

Route.prototype.handler = function(method) {
  this[method] = function(options, fn) {
    return this.layer(method, options, fn);
  };
  return this;
};

/**
 * Add methods to the `route` instance for an array of middleware handlers.
 *
 * ```js
 * route.handlers(['before', 'after']);
 * ```
 * @param {Array} `methods` Method names to add to the `route` instance.
 * @api public
 */

Route.prototype.handlers = function(methods) {
  methods = utils.arrayify(methods);
  for (var i = 0; i < methods.length; i++) {
    this.handler(methods[i]);
  }
  return this;
};

/**
 * Create a layer for the given handler `method`, `options`, and
 * middleware `fn`.
 *
 * ```js
 * route.layer('before', {}, function(){});
 * route.layer('after', {}, [function(){}, function(){}]);
 * route.layer('other', [function(){}, function(){}]);
 * ```
 * @param {String} `name` Layer name
 * @param {Object} `options`
 * @param {Function} `options`
 * @api public
 */

Route.prototype.layer = function(name, options, middlewareFn) {
  debug('layer %s %s', name, this.path);

  if (typeof options === 'function') {
    middlewareFn = options;
    options = null;
  }

  if (typeof middlewareFn !== 'function') {
    throw new TypeError(`Route#${name} ${expected('function', middlewareFn)}`);
  }

  var key = name.toLowerCase();
  var layer = new Layer('/', options, middlewareFn);
  layer.method = key !== 'all' ? key : null;

  this.methods[key] = true;
  this.stack.push(layer);
  return this;
};

function expected(type, val) {
  return `expected a ${type}, but received ${typeOf(val)}`;
}

/**
 * Expose `Route`
 */

module.exports = exports = Route;
