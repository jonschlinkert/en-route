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
exports.getParamNames = function getParamNames (func) {
  var fnStr = func.toString().replace(STRIP_COMMENTS, '');
  var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
  if(result === null) {
     result = [];
   }
  return result;
};