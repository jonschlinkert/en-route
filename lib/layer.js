'use strict';

var pathRegex = require('path-to-regexp');
var debug = require('debug')('layer');
var utils = require('./utils');

/**
 * Initialize a new `Layer` with the given `filepath`, and an array of callback `fns`,
 * and `options`.
 *
 * Options:
 *
 *   - `sensitive`  enable case-sensitive routes
 *   - `strict`     enable strict matching for trailing slashes
 *
 * @param {String} `filepath`
 * @param {Array} `fns`
 * @param {Object} `options`
 * @api private
 */

var Layer = module.exports = function Layer(filepath, fn, options) {
  if (!(this instanceof Layer)) {
    return new Layer(filepath, options, fn);
  }

  debug('new %s', filepath);
  options = options || {};

  this.handle = fn;
  this.name = fn.name || '<anonymous>';
  this.params = undefined;
  this.path = filepath;
  this.base = '';

  this.regexp = pathRegex(filepath, this.keys = [], options);
};

/**
 * Returns `true` if the given path has `:params`.
 *
 * A whole path is one which is not parameterized and, as such, declares the
 * full and complete path of a file to be generated for inclusion in the site.
 *
 * In contrast, a non-whole path is parameterized.  These parameters are
 * typically used by middleware to pre-process a set of similar files in some
 * way.
 *
 * @return {Boolean}
 * @api private
 */

Layer.prototype.hasParams = function hasParams() {
  return this.keys.length !== 0;
};

/**
 * Get or set the basepath to `dir`.
 *
 * @param {String} `dir` The directory to use for the `base` path.
 * @api private
 */

Layer.prototype.base = function base(dir) {
  if (arguments.length === 0) {
    return this.base;
  }
  this.base = dir;
};


/**
 * Check if this type matches `filepath`, if so populate `.params`.
 *
 * @param {String} `filepath`
 * @return {Boolean}
 * @api private
 */

Layer.prototype.match = function match(filepath) {
  var m = this.regexp.exec(filepath);
  if (!m) {
    this.params = undefined;
    this.path = undefined;
    return false;
  }

  // store values
  this.params = {};
  this.path = m[0];

  var keys = this.keys;
  var params = this.params;
  var prop;
  var n = 0;
  var key;
  var val;

  for (var i = 1, len = m.length; i < len; ++i) {
    key = keys[i - 1];
    prop = key
      ? key.name
      : n++;
    val = utils.decodeParam(m[i]);

    if (val !== undefined || !(hasOwnProperty.call(params, prop))) {
      params[prop] = val;
    }
  }

  return true;
};
