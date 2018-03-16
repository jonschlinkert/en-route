'use strict';

const debug = require('debug')('en-route:layer');
const article = require('typeof-article');
const toRegex = require('path-to-regexp');
const typeOf = require('kind-of');
const utils = require('./utils');

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
  constructor(pattern, handler, options) {
    debug('layer "%s", from <%s>', pattern, __filename);

    if (typeof handler !== 'function') {
      throw new TypeError(`${expected('handler function', handler)}`);
    }

    this.options = Object.assign({ strict: false, end: false }, options);
    this.pattern = pattern;
    this.handler = handler;
  }

  /**
   * Handle the file for the layer.
   * @param {File} file
   * @param {function} next
   */

  async handle(file) {
    return this.match(file) ? await this.handler(file) : null;
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

    if (match === true) return true;
    if (!Array.isArray(match)) return null;

    this.params = {};
    this.keys = [];
    let n = 0;

    for (let i = 1; i < match.length; i++) {
      const val = match[i];
      const key = this.keys[i - 1];
      const prop = key && key.name ? key.name : n++;
      if (typeof val !== 'undefined' || !utils.hasOwn(this.params, prop)) {
        this.params[prop] = val;
      }
    }
    return match;
  }

  /**
   * Lazily create the regex to use for matching
   */

  set regex(val) {
    utils.define(this, 'regexp', val);
  }
  get regex() {
    if (this.pattern instanceof RegExp) {
      return (this.regexp = this.pattern);
    }
    if (!(this.regexp instanceof RegExp) && typeof this.pattern === 'string') {
      this.regexp = toRegex(this.pattern, this.keys, this.options);
    }
    return this.regexp;
  }
}

/**
 * Format error messages
 */

function expected(type, val) {
  return `expected a ${type}, but received ${article(val)}`;
}

/**
 * Expose `Layer`
 */

module.exports = Layer;

