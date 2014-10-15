'use strict';

/**
 * Decode `param` value.
 *
 * @param {string} `param`
 * @return {string}
 * @api private
 */

exports.decodeParam = function decodeParam (param) {
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

var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
var ARGUMENT_NAMES = /([^\s,]+)/g;


/**
 * Get the names of the parameters for a given function.
 * 
 * @param  {Function} `fn` Function to parse the parameter names from.
 * @return {Array} List of parameter names.
 * @api private
 */

exports.getParamNames = function getParamNames (fn) {
  var fnStr = fn.toString().replace(STRIP_COMMENTS, '');
  var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
  if(result === null) {
     result = [];
   }
  return result;
};