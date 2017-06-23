'use strict';

/**
 * Module dependencies
 */

var debug = require('debug')('en-route:layer');

/**
 * Local dependencies
 */

var utils = require('./utils');

/**
 * Create a new `Layer` with the given `path`, `options` and handler function.
 * @param {String} path
 * @param {Object} options
 * @param {Function} fn
 */

function Layer(path, options, handler) {
  debug('layer %s, from <%s>', path, __filename);

  this.options = Object.assign({}, options);
  this.handle = handler;
  this.name = this.handle.name || 'layer';
  this.path = path;
  this.regexp = utils.toRegex(path, this.keys = [], this.options);
  this.params = {};
  this.method = null;

  if (this.path === '/' && this.options.end === false) {
    this.fast_slash = true;
  }
};

/**
 * Handle the error for the layer.
 *
 * @param {Error} `error`
 * @param {File} `file`
 * @param {function} `next`
 * @api private
 */

Layer.prototype.handleError = function handleError(err, file, next) {
  if (this.handle.length < 3) {
    next(err);
    return;
  }
  try {
    this.handle(err, file, next);
  } catch (err) {
    next(err);
  }
};

/**
 * Handle the file for the layer.
 *
 * @param {File} file
 * @param {function} next
 * @api private
 */

Layer.prototype.handleFile = function handleFile(file, next) {
  if (this.handle.length > 2) {
    next();
    return;
  }
  try {
    this.handle(file, next);
  } catch (err) {
    next(err);
  }
};

/**
 * Check if this route matches `path`, if so
 * populate `.params`.
 *
 * @param {String} path
 * @return {Boolean}
 * @api private
 */

Layer.prototype.match = function match(path) {
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
  this.params = {};
  this.path = match[0];

  var keys = this.keys;
  var params = this.params;
  var prop;
  var n = 0;
  var key;
  var val;

  for (var i = 1, len = match.length; i < len; ++i) {
    key = keys[i - 1];
    prop = key ? key.name : n++;
    val = utils.decodeParam(match[i]);

    if (typeof val !== 'undefined' || !utils.hasOwn(params, prop)) {
      params[prop] = val;
    }
  }

  return true;
};

/**
 * Expose `Layer`
 */

module.exports = exports = Layer;
