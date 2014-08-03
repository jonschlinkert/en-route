'use strict';

var pathRegex = require('path-to-regexp');
var debug = require('debug')('layout');
var utils = require('./utils');

/**
 * Initialize a new `Layer` with the given `filepath`, and an array of callback `fns`,
 * and `options`.
 *
 * @param {String} `filepath`
 * @param {Array} `fns`
 * @param {Object} `options`
 * @api private
 */

var Layer = module.exports = function Layer(filepath, fns, options) {
  if (!(this instanceof Layer)) {
    return new Layer(filepath, options, fns);
  }

  debug('new %s', filepath);
  options = options || {};
  this.path = filepath;
  this.base = '';

  this.regexp = pathRegex(filepath, this.keys = [], options);
  this.handle = fns;
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

Layer.prototype.hasParams = function () {
  return this.keys.length !== 0;
};


/**
 * Get or set the basepath to `dir`.
 *
 * @param {String} `dir` The directory to use for the `base` path.
 * @api private
 */

Layer.prototype.base = function (dir) {
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

Layer.prototype.match = function(filepath){
  var keys = this.keys;
  var params = this.params = {};
  var m = this.regexp.exec(filepath);
  var n = 0;
  var key;
  var val;

  if (!m) {
    return false;
  }

  this.path = m[0];

  for (var i = 1, len = m.length; i < len; ++i) {
    key = keys[i - 1];
    val = utils.decodeParam(m[i]);

    if (key) {
      params[key.name] = val;
    } else {
      params[n++] = val;
    }
  }

  return true;
};
