'use strict';

exports.hasOwn = (obj, key) => Object.hasOwnProperty.call(obj, key);

const each = async(arr, next) => {
  for (let i = 0; i < arr.length; i++) {
    await next(arr[i], i, arr);
  }
};

exports.each = async(arr, next) => {
  await each(arr, ele => next(ele, arr));
};

/**
 * Cast the given `val` to an array
 */

exports.arrayify = function arrayify(val) {
  return val ? (Array.isArray(val) ? val : [val]) : [];
};

/**
 * Define a non-enumerable property on the given object.
 */

exports.define = function(obj, key, val) {
  Reflect.defineProperty(obj, key, {
    writable: true,
    configurable: true,
    enumerable: false,
    value: val
  });
};
