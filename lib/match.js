'use strict';

var utils = require('./utils');

/**
 * Expose `match`.
 */

module.exports = match;

function match(layer, path, params) {
  this.layer = layer;
  this.params = {};
  this.path = path || '';

  if (!params) {
    return this;
  }

  var keys = layer.keys;
  var n = 0;
  var prop;
  var key;
  var val;

  for (var i = 0; i < params.length; i++) {
    key = keys[i];
    val = utils.decodeParam(params[i]);
    prop = key
      ? key.name
      : n++;

    this.params[prop] = val;
  }
  return this;
}
