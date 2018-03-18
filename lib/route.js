'use strict';

const Emitter = require('@sellside/emitter');
const debug = require('debug')('en-route:route');
const Layer = require('./layer');

/**
 * Initialize `Route` with the given `path`,
 *
 * ```js
 * const route = new Route('/', ['preRender', 'postRender']);
 * ```
 * @name Route
 * @extends {Class} Emitter
 * @param {String} `path`
 * @api public
 */

class Route extends Emitter {
  constructor(pattern, fns, options) {
    debug('route "%s", from <%s>', pattern, __filename);
    super();
    this.pattern = pattern;
    this.options = options;
    this.stack = [];
    this.layers(this.pattern, fns, this.options);
  }

  /**
   * Register a handler to be called on all layers on the route.
   *
   * ```js
   * route.all(file => {
   *   file.data.title = 'Home';
   * });
   * ```
   * @name .all
   * @param {Function} `fn` Handler function
   * @return {Object} Route instance for chaining
   * @api public
   */

  all(fns) {
    return this.layers('/', fns);
  }

  /**
   * Run a middleware stack on the given `file`.
   *
   * ```js
   * route.handle(file, function(err, res) {
   *   console.log(err, res);
   * });
   * ```
   * @name .handle
   * @param {Object} `file` File object
   * @return {Function} Callback that exposes `err` and `file`
   * @api public
   */

  async handle(file) {
    this.status = 'starting';
    this.emit('handle', file);

    for (const layer of this.stack) {
      this.emit('layer', layer, file);
      await layer.handle(file);
    }

    this.status = 'finished';
    this.emit('handle', file);
    return file;
  }

  /**
   * Push a layer onto the stack for the given pattern and middleware function.
   *
   * ```js
   * route.layers(function(){});
   * route.layers([function(){}, function(){}]);
   * ```
   * @name .layer
   * @param {Function} `fns` Middleware functions
   * @api public
   */

  layer(pattern, fn) {
    this.stack.push(new Layer(pattern, fn, this.options));
    return this;
  }

  /**
   * Push a layer onto the stack for each middleware function.
   *
   * ```js
   * route.layers(function(){});
   * route.layers([function(){}, function(){}]);
   * ```
   * @name .layers
   * @param {Function} `fns` Middleware functions
   * @api public
   */

  layers(pattern, fns) {
    arrayify(fns).forEach(fn => this.layer(pattern, fn));
    return this;
  }
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
