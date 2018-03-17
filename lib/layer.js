'use strict';

const assert = require('assert');
const debug = require('debug')('en-route:layer');
const toRegex = require('path-to-regexp');
const hasOwn = (obj, key) => Object.hasOwnProperty.call(obj, key);

/**
 * Create a new `Layer` with the given `pattern`, `options` and handler function.
 *
 * ```js
 * const layer = new Layer('/', function(file, next) {
 *   // do stuff to file
 *   next(null, file);
 * });
 * ```
 * @param {String} `pattern`
 * @param {Object} `options`
 * @param {Function} `handler`
 * @returns {undefined}
 * @api public
 */

class Layer {
  constructor(pattern, fn, options) {
    debug('layer "%s", from <%s>', pattern, __filename);
    assert.equal(typeof fn, 'function', 'expected handler to be a function');

    this.options = Object.assign({ strict: false, end: false }, options);
    this.pattern = pattern;

    this.handler = file => {
      let params = this.match(file);
      if (params) {
        return fn.call(this, file, params);
      }
    };
  }

  /**
   * Handle the file for the layer.
   * @param {File} file
   * @param {function} next
   */

  async handle(file) {
    return await this.handler(file);
  }

  /**
   * returns true and populates `.params` when the given `pattern`
   * matches layer pattern.
   * @param {String} pattern
   * @return {Boolean}
   */

  match(file) {
    if (!file.path) return null;

    const match = this.regex.exec(file.path);
    if (!match) return null;

    const params = {};
    let n = 0;

    for (let i = 1; i < match.length; i++) {
      const val = match[i];
      const key = this.regex.keys[i - 1];
      const prop = key && key.name ? key.name : n++;
      if (typeof val !== 'undefined' || !hasOwn(params, prop)) {
        params[prop] = val;
      }
    }
    return params;
  }

  /**
   * Lazily create the regex to use for matching
   */

  set regex(val) {
    define(this, 'regexp', val);
  }
  get regex() {
    if (this.pattern instanceof RegExp) {
      return (this.regexp = this.pattern);
    }
    if (!(this.regexp instanceof RegExp) && typeof this.pattern === 'string') {
      const keys = [];
      const regex = toRegex(this.pattern, keys, this.options);
      regex.keys = keys;
      return regex;
    }
    return this.regexp;
  }
}

function define(ctx, key, val) {
  Reflect.defineProperty(ctx, key, {
    writable: true,
    configurable: true,
    enumerable: false,
    value: val
  });
}

/**
 * Expose `Layer`
 */

module.exports = Layer;

