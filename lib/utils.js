'use strict';

/**
 * Returns true if `obj` has own property `key`
 */

exports.hasOwn = function(obj, key) {
  return {}.hasOwnProperty.call(obj, key);
};

/**
 * Cast the given `val` to an array
 */

exports.arrayify = function arrayify(val) {
  return val ? (Array.isArray(val) ? val : [val]) : [];
};

/**
 * Decode param value.
 *
 * @param {string} val
 * @return {string}
 * @api private
 */

exports.decodeParam = function decodeParam(val) {
  if (typeof val !== 'string') {
    return val;
  }

  try {
    return decodeURIComponent(val);
  } catch (e) {
    var err = new TypeError('Failed to decode param: "' + val + '"');
    err.status = 400;
    throw err;
  }
};
