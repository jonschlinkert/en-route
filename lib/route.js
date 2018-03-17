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
    this.layers(fns);
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
    for (const layer of this.stack) await layer.handle(file);
    return file;
  }

  /**
   * Push a layer onto the stack for each middleware function.
   *
   * ```js
   * route.layers({}, function(){});
   * route.layers({}, [function(){}, function(){}]);
   * route.layers([function(){}, function(){}]);
   * ```
   * @name .layers
   * @param {Function} `fns` Middleware functions
   * @api public
   */

  layers(fns) {
    arrayify(fns).forEach(fn => {
      this.stack.push(new Layer(this.pattern, fn, this.options));
    });
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
