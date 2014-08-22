'use strict';

var Route = require('./layer');
var debug = require('debug')('router');
var _ = require('lodash');


/**
 * Initialize a new `Router`.
 *
 * **Example:**
 *
 * ```js
 * var Router = require('en-route');
 * var router = new Router([options]);
 * ```
 *
 * @param  {Object} `options`
 * @api public
 */

var Router = module.exports = function Router(options) {
  this.options = options || {};
  this._routes = [];
};


/**
 * ## .middleware
 *
 * Call the dispatcher on a `file` object.
 *
 * @param {Object} `file` File object.
 * @param {Function} `next` Callback.
 * @return {Object}
 * @api public
 */

Router.prototype.middleware = function (file, next) {
  this.dispatch.call(this, file, next);
};


/**
 * ## .middlewareSync
 *
 * Call the dispatcher on a `file` object.
 *
 * @param {Object} `file` File object.
 * @return {Object} object containing an `err` if an error occurred.
 * @api public
 */

Router.prototype.middlewareSync = function(file) {
  return this.dispatchSync.call(this, file);
};


/**
 * ## .route
 *
 * Route `filepath` to one or more callbacks.
 *
 * @param {String} `filepath`
 * @param {Function|Array} `middleware` Middleware stack.
 * @return {Object}
 * @api public
 */

Router.prototype.route = function (filepath, middleware) {
  var fns = _.flatten([].slice.call(arguments, 1));
  debug('route %s', filepath);

  var route = new Route(filepath, fns, this.options);
  this._routes.push(route);
  return route;
};


/**
 * ## .dispatch
 *
 * Route dispatcher, aka the router "middleware".
 *
 * @param {Object} `file` file object.
 * @param {Function} `next` Callback
 * @api private
 */

Router.prototype.dispatch = function (file, next) {
  debug('dispatching %s %s', file.path);

  var self = this;

  // route dispatch
  (function dispatch(i, err) {
    function nextRoute(err) {
      dispatch(file.i + 1, err);
    }

    // match route
    var route = self._match(file, i);

    // no route
    if (!route) {
      return next(err);
    }
    debug('matched %s', route.filepath);

    file.params = route.params;

    // invoke route callbacks
    var j = 0;

    function callbacks(err) {
      var fn = route.handle[j++];

      try {
        if (err === 'route') {
          nextRoute();
        } else if (err && fn) {
          if (fn.length < 3) {
            return callbacks(err);
          }
          debug('applying %s %s', file.path, fn.name || 'anonymous');
          fn(err, file, callbacks);
        } else if (fn) {
          if (fn.length < 3) {
            debug('applying %s %s', file.path, fn.name || 'anonymous');
            return fn(file, callbacks);
          }
          callbacks();
        } else {
          nextRoute(err);
        }
      } catch (err) {
        callbacks(err);
      }
    }
    callbacks();
  })(0);
};


/**
 * Route dispatcher, aka the router "middleware".
 *
 * @param {Object} `file` file object.
 * @return {Object} object containing an `err` if an error occurred.
 * @api private
 */

Router.prototype.dispatchSync = function(file) {
  var results = {};
  this.dispatch.call(this, file, function (err) {
    results.err = err;
  });
  return results;
};


/**
 * Attempt to match a route for `file` with
 * optional starting index of `i` defaulting
 * to 0.
 *
 * @param {String} `file`
 * @param {Number} `i` The index of the current file.
 * @return {route} Matching routes.
 * @api private
 */

Router.prototype._match = function (file, i) {
  var filepath = file.path;
  var routes = this._routes;
  var route;

  i = i || 0;

  // matching routes
  for (var len = routes.length; i < len; ++i) {
    route = routes[i];
    if (route.match(filepath)) {
      file.i = i;
      return route;
    }
  }
};


/**
 * Utilize the given middleware `fn` to the given `path`,
 * defaulting to `_/_`.
 *
 * **Example:**
 *
 * ```js
 * router.use();
 * ```
 *
 * @param {String|Function} `path`
 * @param {Function} `fn`
 * @return {Router} for chaining.
 * @api public
 */

Router.prototype.use = function (route, fn) {
  // default route to '/'
  if (typeof route !== 'string') {
    fn = route;
    route = '/';
  }

  if (typeof fn !== 'function') {
    var type = {}.toString.call(fn);
    var msg = 'Router.use() requires callback functions but got a ' + type;
    throw new Error(msg);
  }

  // strip trailing slash
  if (route[route.length - 1] === '/') {
    route = route.slice(0, -1);
  }

  // add the middleware
  debug('use %s %s', route || '/', fn.name || 'anonymous');
  this.stack.push({path: route, handle: fn});
  return this;
};
