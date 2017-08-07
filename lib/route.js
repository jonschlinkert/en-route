'use strict';

var debug = require('debug')('en-route:route');
var reduce = require('async-array-reduce');
var article = require('typeof-article');
var Layer = require('./layer');
var utils = require('./utils');

/**
 * Initialize `Route` with the given `path`,
 *
 * ```js
 * var route = new Route('/', ['preRender', 'postRender']);
 * ```
 * @param {String} `path`
 * @api public
 */

function Route(path, methods) {
  debug('initializing route %s, from <%s>', path, __filename);
  this.path = path;
  this.methods = {};
  this.stack = [];
  this.handlers(methods);
}

/**
 * Returns true if the route can handle the given method
 * @param {String} `method` method to check
 * @return {Boolean}
 */

Route.prototype.handlesMethod = function(method) {
  if (this.methods.all === true) return true;
  if (typeof method !== 'string') {
    throw new TypeError(expected('string', method));
  }
  return utils.hasOwn(this.methods, method);
};

/**
 * Dispatch a middleware stack over the given `file`.
 *
 * ```js
 * route.dispatch(file, function(err, res) {
 *   console.log(err, res);
 * });
 * ```
 * @param {Object} `file` File object
 * @return {Function} Callback that exposes `err` and `file`
 * @api public
 */

Route.prototype.dispatch = function(file, cb) {
  file.options = file.options || {};
  file.options.route = this;

  reduce(this.stack, file, function(acc, layer, next) {
    if (!layer) {
      next(null, file);
      return;
    }

    try {
      layer.handle(file, (err) => next(err, file));
    } catch (err) {
      next(err);
    }
  }, function(err) {
    cb(err, file);
  });
};

/**
 * Handler for all methods on the route.
 *
 * ```js
 * route.all(function(file, next) {
 *   file.data.title = 'Home';
 *   next(null, file);
 * });
 * ```
 * @param {Function} `handler`
 * @return {Object} Route instance for chaining
 * @api public
 */

Route.prototype.all = function(handler) {
  if (Array.isArray(handler)) {
    handler.forEach(this.all.bind(this));
    return this;
  }
  if (typeof handler !== 'function') {
    throw new TypeError('expected handler to be a function');
  }
  this.layer('all', handler);
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
 * Returns true if any layers in `route.stack` match
 * the given `path`.
 *
 * ```js
 * console.log(route.match('foo/bar.js'));
 * //=> true or false
 * ```
 * @param {String} `path`
 * @return {Boolean}
 * @api public
 */

Route.prototype.match = function(path) {
  for (var i = 0; i < this.stack.length; i++) {
    if (this.stack[i].match(path)) return true;
  }
  return false;
};

/**
 * Push a layer onto the stack for the given handler `method`
 * and middleware `fn`.
 *
 * ```js
 * route.layer('before', {}, function(){});
 * route.layer('after', {}, [function(){}, function(){}]);
 * route.layer('other', [function(){}, function(){}]);
 * ```
 * @param {String} `name` Layer name
 * @param {Function} `fn` Middleware function
 * @api public
 */

Route.prototype.layer = function(method, fn) {
  if (typeof fn !== 'function') {
    throw new TypeError(`Route#${method} ${expected('function', fn)}`);
  }
  debug('layer %s %s', method, this.path);
  var layer = new Layer('/', {}, fn);
  layer.method = method;
  this.methods[method] = true;
  this.stack.push(layer);
  return this;
};

/**
 * Format error messages
 */

function expected(type, val) {
  return `expected a ${type}, but received ${article(val)}`;
}

/**
 * Expose `Route`
 */

module.exports = exports = Route;
