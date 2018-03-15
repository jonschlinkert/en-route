'use strict';

const debug = require('debug')('en-route:route');
const article = require('typeof-article');
const Layer = require('./layer');
const utils = require('./utils');

/**
 * Initialize `Route` with the given `path`,
 *
 * ```js
 * const route = new Route('/', ['preRender', 'postRender']);
 * ```
 * @param {String} `path`
 * @api public
 */

class Route {
  constructor(path, methods) {
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

  handlesMethod(method) {
    return this.methods.all || utils.hasOwn(this.methods, method);
  }

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

  dispatch(file, cb) {
    const handle = layer => !(layer && layer.handle) || layer.handle(file);
    const promise = new Promise((resolve, reject) => {
      utils.each(this.stack, layer => handle(layer)).then(resolve, reject);
    });

    if (typeof cb === 'function') {
      promise.then(() => cb(null, file), cb);
      return;
    }
    return promise;
  }

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

  all(handler) {
    if (Array.isArray(handler)) {
      handler.forEach(this.all.bind(this));
      return this;
    }
    if (typeof handler !== 'function') {
      throw new TypeError('expected handler to be a function');
    }
    this.layer('all', handler);
    return this;
  }

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

  handler(method) {
    this[method] = (options, fn) => this.layer(method, options, fn);
    return this;
  }

  /**
   * Add methods to the `route` instance for an array of middleware handlers.
   *
   * ```js
   * route.handlers(['before', 'after']);
   * ```
   * @param {Array} `methods` Method names to add to the `route` instance.
   * @api public
   */

  handlers(methods) {
    utils.arrayify(methods).forEach(m => this.handler(m));
    return this;
  }

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

  match(path) {
    return this.stack.some(layer => layer.match(path));
  }

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

  layer(method, fn) {
    debug('layer %s %s', method, this.path);
    if (typeof fn !== 'function') {
      throw new TypeError(`Route#${method} ${expected('function', fn)}`);
    }
    const layer = new Layer('/', {}, fn);
    layer.method = method;
    this.methods[method] = true;
    this.stack.push(layer);
    return this;
  }
}

/**
 * Format error messages
 */

function expected(type, val) {
  return `expected a ${type}, but received ${article(val)}`;
}

/**
 * Expose `Route`
 */

module.exports = Route;
