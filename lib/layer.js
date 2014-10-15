'use strict';

var pathRegex = require('path-to-regexp');
var debug = require('debug')('layout');
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

var Layer = module.exports = function Layer (filter, fns, options) {
  if (!(this instanceof Layer)) {
    return new Layer(filter, options, fns);
  }
  this.regexp = null;

  if (typeof filter === 'string') {
    var filepath = filter;
    debug('new %s', filepath);
    this.regexp = pathRegex(filepath, this.keys = [], options);
    this.path = filepath;
    filter = defaultFilter(this.regexp);
  }

  options = options || {};
  this.filter = filter;
  this.base = '';

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

Layer.prototype.match = function() {
  return this.filter.apply(this, arguments);
};

Layer.prototype.matchStr = function(str) {
  var keys = this.keys;
  var params = this.params = {};
  var n = 0;
  var key;
  var val;

  if (!this.regexp) {
    return false;
  }

  var m = this.regexp.exec(str);
  if (!m) {
    return false;
  }
  this.path = m[0];

  for (var i = 1, len = m.length; i < len; ++i) {
    key = keys[i-1];
    val = utils.decodeParam(m[i]);

    if (key) {
      params[key.name] = val;
    } else {
      params[n++] = val;
    }
  }
  return true;
};


function defaultFilter (regexp) {
  return function () {
    var args = [].slice.call(arguments);
    var filepath = '';

    if (typeof args[0] === 'string') {
      filepath = args[0];
    } else {
      filepath = args[0].path || '';
    }

    return this.matchStr(filepath);
  };
};
