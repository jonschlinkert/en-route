'use strict';

/**
 * Decode param value.
 *
 * @param {string} val
 * @return {string}
 * @api private
 */

exports.decodeParam = function decodeParam(val){
  if (typeof val !== 'string') {
    return val;
  }

  try {
    return decodeURIComponent(val);
  } catch (e) {
    var err = new TypeError("Failed to decode param '" + val + "'");
    err.status = 400;
    throw err;
  }
};
