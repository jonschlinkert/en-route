'use strict';

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