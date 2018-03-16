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
  constructor(pattern, fns, options) {
    debug('route "%s", from <%s>', pattern, __filename);
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
   * @param {Object} `file` File object
   * @return {Function} Callback that exposes `err` and `file`
   * @api public
   */

  handle(file, method) {
    return utils.each(this.stack, layer => layer.handle(file))
  }

  /**
   * Push a layer onto the stack for the given handler `method`
   * and middleware `fn`.
   *
   * ```js
   * route.layer({}, function(){});
   * route.layer({}, [function(){}, function(){}]);
   * route.layer([function(){}, function(){}]);
   * ```
   * @param {Object} `options` Layer options
   * @param {Function} `fn` Middleware function
   * @api public
   */

  layers(fns) {
    utils.arrayify(fns).forEach(fn => {
      this.stack.push(new Layer(this.pattern, fn, this.options));
    });
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
