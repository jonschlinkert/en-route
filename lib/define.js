
module.exports = function(obj, key, val) {
  Reflect.defineProperty(obj, key, {
    writable: true,
    configurable: true,
    enumerable: false,
    value: val
  });
};
