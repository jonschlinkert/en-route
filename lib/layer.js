'use strict';

var debug = require('debug')('en-route:layer');
var toRegex = require('path-to-regexp');
var utils = require('./utils');

/**
 * Create a new `Layer` with the given `path`, `options` and handler function.
 *
 * ```js
 * var layer = new Layer('/', function(file, next) {
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

function Layer(path, options, handler) {
  debug('layer %s, from <%s>', path, __filename);
  this.path = path;
  this.options = Object.assign({strict: false, end: false}, options);
  this.handler = handler;
  this.method = null;
  this.params = {};
}

/**
 * Non-enumerable regex cache
 */

Layer.prototype.regex = null;

/**
 * Handle the file for the layer.
 * @param {File} file
 * @param {function} next
 */

Layer.prototype.handle = function(file, next) {
  try {
    this.handler(file, next);
  } catch (err) {
    next(err);
  }
};

/**
 * returns true and populates `.params` when the given `path`
 * matches layer path.
 * @param {String} path
 * @return {Boolean}
 */

Layer.prototype.match = function(path) {
  // no path, nothing matches
  if (!path) {
    return false;
  }

  // fast path non-ending match for / (everything matches)
  if (this.fast_slash) {
    this.params = {};
    this.path = '';
    return true;
  }

  var match = this.regexp.exec(path);
  if (!match) {
    return false;
  }

  // store values
  this.path = match[0];
  this.params = {};
  var n = 0;

  for (let i = 1; i < match.length; i++) {
    let val = utils.decodeParam(match[i]);
    let key = this.keys[i - 1];
    let prop = key ? key.name : n++;
    if (typeof val !== 'undefined' || !utils.hasOwn(this.params, prop)) {
      this.params[prop] = val;
    }
  }
  return true;
};

/**
 * Lazily create the regex to use for matching
 */

Object.defineProperty(Layer.prototype, 'regexp', {
  enumerable: true,
  get: function() {
    if (!this.regex) {
      this.regex = toRegex(this.path, this.keys = [], this.options);
    }
    return this.regex;
  }
});

/**
 * Expose `Layer`
 */

module.exports = exports = Layer;

