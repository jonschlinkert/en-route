'use strict';

var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
var ARGUMENT_NAMES = /([^\s,]+)/g;

/**
 * Decode `param` value.
 *
 * @param {string} `param`
 * @return {string}
 * @api private
 */

exports.decodeParam = function decodeParam(param) {
  if (typeof param !== 'string') {
    return param;
  }

  try {
    return decodeURIComponent(param);
  } catch (e) {
    var err = new TypeError("Failed to decode param '" + param + "'");
    err.status = 400;
    throw err;
  }
};


/**
 * Get the names of the parameters for a given function.
 *
 * @param  {Function} `fn` Function to parse the parameter names from.
 * @return {Array} List of parameter names.
 * @api private
 */

exports.getParamNames = function getParamNames(fn) {
  var params = fn.toString().replace(STRIP_COMMENTS, '');
  var a = params.indexOf('(') + 1;
  var b = params.indexOf(')');
  var result = params.slice(a, b).match(ARGUMENT_NAMES);
  if (result == null) {
    return [];
  }
  return result;
};


/**
 * Check to see if a string or array is a glob pattern.
 *
 * @param  {String|Array} `pattern` Possible glob pattern
 * @return {Boolean}
 */

exports.isGlob = function isGlob(pattern) {
  return /[*{}]/.test(pattern);
};
