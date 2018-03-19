'use strict';

const assert = require('assert');
const toRegex = require('path-to-regexp');

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
    assert.equal(typeof fn, 'function', 'expected handler to be a function');
    this.options = { strict: false, end: false, ...options };
    this.pattern = pattern;
    this.handler = file => {
      let params = this.match(file.path);
      if (params) {
        return fn(file, params);
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

  match(path) {
    if (!path) return null;

    const match = this.regex.exec(path);
    if (!match) return null;

    const captures = match.slice(1);
    const params = {};
    let n = 0;

    for (let i = 0; i < captures.length; i++) {
      const val = captures[i];
      const key = this.regex.keys[i];
      const prop = key && key.name ? key.name : n++;
      params[prop] = val;
    }
    return params;
  }

  /**
   * Lazily create the regex to use for matching
   */

  get regex() {
    if (this.pattern instanceof RegExp) {
      return (this.regexp = this.pattern);
    }
    if (typeof this.pattern === 'string') {
      const keys = [];
      const regex = toRegex(this.pattern, keys, this.options);
      regex.keys = keys;
      return regex;
    }
  }
}

/**
 * Expose `Layer`
 */

module.exports = Layer;

