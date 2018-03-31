'use strict';

const assert = require('assert');
const toRegex = require('path-to-regexp');

/**
 * Create a new `Layer` with the given `pattern`, handler function and options.
 *
 * ```js
 * const layer = new Layer('/', file => {
 *   // do stuff to file
 *   file.extname = '.html';
 * });
 * ```
 * @name Layer
 * @param {string} `pattern`
 * @param {function} `handler`
 * @param {object} `options`
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
   * Calls the layer handler on the given file if the `file.path` matches
   * the layer pattern.
   *
   * ```js
   * layer.handle(file)
   *   .then(() => console.log('Done:', file))
   *   .then(console.error)
   * ```
   * @name .handle
   * @param {object} `file` File object
   * @return {Promise}
   * @api public
   */

  async handle(file) {
    await this.handler(file);
    return file;
  }

  /**
   * Attempts to match a file path with the layer pattern. If the path matches,
   * an object of params is returned (see [path-to-regexp][] for details), otherwise
   * `null` is returned.
   *
   * ```js
   * const layer = new Layer('/:name');
   * console.log(layer.match('/foo')) //=> { name: 'foo' }
   * ```
   * @name .match
   * @param {string} `filepath`
   * @return {object|null}
   * @api public
   */

  match(filepath) {
    if (!filepath) return null;

    const match = this.regex.exec(filepath);
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
      const regex = (this.regexp = this.pattern);
      regex.lastIndex = 0;
      regex.keys = [];
      return regex;
    }
    if (typeof this.pattern === 'string') {
      const keys = [];
      const regex = toRegex(this.pattern, keys, this.options);
      regex.lastIndex = 0;
      regex.keys = keys;
      return regex;
    }
  }
}

/**
 * Expose `Layer`
 */

module.exports = Layer;

