'use strict';

/**
 * Most of this code is from [expressjs](https://github.com/strongloop/express)
 *
 * Note that material changes were made to enable handling
 * file objects instead of requests and responses.
 */

var Route = require('./lib/route');
var Router = require('./lib');

module.exports.Route = Route;
module.exports.Router = Router;

