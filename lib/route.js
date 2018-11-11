'use strict';

const Emitter = require('events');
const Layer = require('./layer');

/**
 * Create a new `Route` with the given pattern, handler functions and options.
 *
 * ```js
 * const fn = file => file.count++;
 * const Route = require('en-route').Route;
 * const route = new Route('/(.*)', [fn, fn, fn]);
 * const file = { path: '/foo', count: 0 };
 *
 * route.handle(file)
 *   .then(file => {
 *     console.log(file.count); // 3
 *   });
 * ```
 * @name Route
 * @extends {Class} EventEmitter
 * @param {string|regex} `pattern`
 * @param {function|array} `fns` One or more middleware functions.
 * @param {object} `options`
 * @api public
 */

class Route extends Emitter {
  constructor(pattern, fns, options = {}) {
    super();
    this.pattern = pattern;
    this.options = options;
    this.stack = [];
    this.layers(this.pattern, fns, this.options);

    if (this.options.sync) {
      this.handle = handle.bind(null, this);
    }
  }

  /**
   * Register one or more handler functions to be called on all
   * layers on the route.
   *
   * ```js
   * route.all(function(file) {
   *   file.data.title = 'Home';
   * });
   * route.all([
   *   function(file) {},
   *   function(file) {}
   * ]);
   * ```
   * @name .all
   * @param {function|array} `fns` Handler function or array of handler functions.
   * @return {object} Route instance for chaining
   * @api public
   */

  all(fns) {
    return this.layers('/', fns);
  }

  /**
   * Run a middleware stack on the given `file`.
   *
   * ```js
   * route.handle(file)
   *   .then(file => console.log('File:', file))
   *   .catch(console.error);
   * ```
   * @name .handle
   * @param {object} `file` File object
   * @return {object} Callback that exposes `err` and `file`
   * @return {object} Returns a promise with the file object.
   * @api public
   */

  async handle(file) {
    this.status = 'starting';
    this.emit('handle', file);
    let pending = [];

    for (let layer of this.stack) {
      this.emit('layer', layer, file);
      if (this.options.parallel) {
        pending.push(layer.handle(file));
      } else {
        await layer.handle(file);
      }
    }

    if (this.options.parallel) await Promise.all(pending);
    this.status = 'finished';
    this.emit('handle', file);
    return file;
  }

  /**
   * Push a layer onto the stack for a middleware functions.
   *
   * ```js
   * route.layer(/foo/, file => {
   *   // do stuff to file
   *   file.layout = 'default';
   * });
   * ```
   * @name .layer
   * @param {string|regex} `pattern` The pattern to use for matching files to determin if they should be handled.
   * @param {function|array} `fn` Middleware functions
   * @return {object} Route instance for chaining
   * @api public
   */

  layer(pattern, fn) {
    this.stack.push(new Layer(pattern, fn, this.options));
    return this;
  }

  /**
   * Push a layer onto the stack for one or more middleware functions.
   *
   * ```js
   * route.layers(/foo/, function);
   * route.layers(/bar/, [function, function]);
   * ```
   * @name .layers
   * @param {string|regex} `pattern`
   * @param {function|array} `fns` One or more middleware functions
   * @return {object} Route instance for chaining
   * @api public
   */

  layers(pattern, fns) {
    for (const fn of arrayify(fns)) this.layer(pattern, fn);
    return this;
  }
}

/**
 * Sync method, used when options.sync is true
 */

function handle(route, file) {
  route.status = 'starting';
  route.emit('handle', file);

  for (let layer of route.stack) {
    route.emit('layer', layer, file);
    layer.handle(file);
  }

  route.status = 'finished';
  route.emit('handle', file);
  return file;
}

/**
 * Cast `val` to an array
 */

function arrayify(val) {
  return val ? (Array.isArray(val) ? val : [val]) : [];
}

/**
 * Expose `Route`
 */

module.exports = Route;
