'use strict';

/**
 * Although material changes were made to enable handling file
 * objects instead of requests and responses, much of this code
 * was originally from [expressjs](https://github.com/strongloop/express)
 * Copyright (c) 2009-2014 TJ Holowaychuk <tj@vision-media.ca>
 */

var Route = require('./lib/route');
var Router = require('./lib');

module.exports.Route = Route;
module.exports.Router = Router;

