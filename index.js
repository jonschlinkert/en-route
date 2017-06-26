'use strict';

/*!
 * en-route <https://github.com/jonschlinkert/en-route>
 * Some of this code was originally from
 * [expressjs](https://github.com/strongloop/express)
 * Copyright (c) 2009-2014 TJ Holowaychuk <tj@vision-media.ca>
 * Copyright (c) 2015-2017, Jon Schlinkert.
 * Released under the MIT License.
 */

var Layer = require('./lib/layer');
var Route = require('./lib/route');
var Router = require('./lib');

module.exports = Router;
module.exports.Route = Route;
module.exports.Router = Router;
module.exports.Layer = Layer;

