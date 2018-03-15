'use strict';

const debug = require('debug')('en-route:layer');
const toRegex = require('path-to-regexp');
const utils = require('./utils');

/**
 * Create a new `Layer` with the given `path`, `options` and handler function.
 *
 * ```js
 * const layer = new Layer('/', function(file, next) {
 *   // do stuff to file
 *   next(null, file);
 * });
 * ```
 * @param {String} `path`
 * @param {Object} `options`
 * @param {Function} `handler`
 * @returns {undefined}
 * @api public
 */

class Layer {
  constructor(path, options, handler) {
    debug('layer %s, from <%s>', path, __filename);
    this.path = path;
    this.options = Object.assign({ strict: false, end: false }, options);
    this.handler = handler;
    this.method = null;
    this.params = {};
  }

  /**
   * Handle the file for the layer.
   * @param {File} file
   * @param {function} next
   */

  handle(file, next) {
    const promise = new Promise((resolve, reject) => {
      this.handler(file, function(err, res) {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });

    if (typeof next === 'function') {
      promise.then(res => next(null, res), next);
      return;
    }

    return promise;
  }

  /**
   * returns true and populates `.params` when the given `path`
   * matches layer path.
   * @param {String} path
   * @return {Boolean}
   */

  match(path) {
    if (!path) return false;

    const match = this.regexp.exec(path);
    if (!match) return false;

    this.path = match[0];
    this.params = {};
    let n = 0;

    for (let i = 1; i < match.length; i++) {
      const val = match[i];
      const key = this.keys[i - 1];
      const prop = key && key.name ? key.name : n++;
      if (typeof val !== 'undefined' || !utils.hasOwn(this.params, prop)) {
        this.params[prop] = val;
      }
    }
    return true;
  }

  /**
   * Lazily create the regex to use for matching
   */

  set regexp(val) {
    this.regex = val;
  }
  get regexp() {
    if (!(this.regex instanceof RegExp)) {
      this.regex = toRegex(this.path, this.keys = [], this.options);
    }
    return this.regex;
  }
}

/**
 * Expose `Layer`
 */

module.exports = Layer;

