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
    this.isMatch = this.matcher(pattern);
    this.pattern = pattern;
    this.handler = handler;
  }

  /**
   * Handle the file for the layer.
   * @param {File} file
   * @param {function} next
   */

  async handle(file) {
    return await this.match(file) ? this.handler(file) : null;
  }

  /**
   * returns true and populates `.params` when the given `pattern`
   * matches layer pattern.
   * @param {String} pattern
   * @return {Boolean}
   */

  match(file) {
    if (!file.path) return null;

    const match = this.isMatch(file);
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

  matcher(pattern) {
    switch (typeOf(pattern)) {
      case 'string':
        return file => file && this.regexp.exec(file.path);
      case 'regexp':
        return file => {
          console.log(file, pattern)
          return file && pattern.exec(file.path);
        };
      case 'function':
        return pattern;
      default: {
        throw new TypeError(`invalid route path: ${util.inspect(pattern)}`);
      }
    }
  }

  /**
   * Lazily create the regex to use for matching
   */

  set regexp(val) {
    this.regex = val;
  }
  get regexp() {
    if (this.pattern instanceof RegExp) {
      return (this.regex = this.pattern);
    }
    if (!(this.regex instanceof RegExp) && typeof this.pattern === 'string') {
      this.regex = toRegex(this.pattern, this.keys, this.options);
    }
    return this.regex;
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

