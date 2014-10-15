'use strict';

var Route = require('./layer');
var debug = require('debug')('router');
var _ = require('lodash');
var utils = require('./utils');


/**
 * Initialize a new `Router` with the given `options`.
 *
 * ```js
 * var Router = require('en-route');
 * var router = new Router(options);
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
 * Call the dispatcher on a `file` object.
 *
 * @param {Object} `file` File object.
 * @param {Function} `next` Callback.
 * @return {Object}
 * @api public
 */

Router.prototype.middleware = function () {
  this.dispatch.apply(this, arguments);
};


/**
 * Call the dispatcher on a `file` object.
 *
 * @param {Object} `file` File object.
 * @return {Object} object containing an `err` if an error occurred.
 * @api public
 */

Router.prototype.middlewareSync = function(file) {
  return this.dispatchSync.apply(this, arguments);
};


/**
 * Route `filepath` to one or more callbacks.
 *
 * @param {String} `filepath`
 * @param {Function|Array} `middleware` Middleware stack.
 * @return {Object}
 * @api public
 */

Router.prototype.route = function (filter, middleware) {
  var fns = _.flatten([].slice.call(arguments));
  if (typeof filter === 'string') {
    debug('route %s', filter);
    fns.shift();
  } else {
    var args = utils.getParamNames(filter);
    if (args[args.length-1] === 'next') {
      filter = '*';
    } else {
      fns.shift();
    }
  }

  var route = new Route(filter, fns, this.options);
  this._routes.push(route);
  return route;
};


/**
 * Route dispatcher, aka the router "middleware".
 *
 * @param {Object} `file` file object.
 * @param {Function} `next` Callback
 * @api private
 */

Router.prototype.dispatch = function () {
  debug('dispatching ', arguments);
  var self = this;
  var args = [].slice.call(arguments);
  var next = args.pop();
  var state = {
    args: args,
    i: 0
  };

  // route dispatch
  (function dispatch(i, err) {
    function nextRoute(err) {
      dispatch(state.i + 1, err);
    }

    // match route
    var route = self._match(state, i);

    // no route
    if (!route) {
      return next(err);
    }
    debug('matched %j', route);
    state.params = route.params;

    // invoke route callbacks
    var j = 0;

    function callbacks(err) {
      var fn = route.handle[j++];
      try {
        if (err === 'route') {
          // middleware called `next('route')`
          debug('err === "route"');
          nextRoute();
        } else if (err && fn) {
          // middleware called `next(err)`
          debug('err && fn', fn.length);
          var argNames = utils.getParamNames(fn);
          if (argNames.length === 0 || (argNames[0] !== 'err' && argNames[0] !== 'error')) {
            // `fn` isn't the error callback so skip it
            return callbacks(err);
          }
          // `fn` is the error callback
          debug('applying %s', fn.name || 'anonymous');
          fn.apply(route, [err].concat(state.args.concat(callbacks)));
        } else if (fn) {
          // `fn` is a middleware, if it matches the arguments, then call it
          debug('fn', fn.length, args.length);
          if (fn.length === args.length + 1) {
            debug('applying %s', fn.name || 'anonymous');
            return fn.apply(route, state.args.concat(callbacks));
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

Router.prototype.dispatchSync = function() {
  var results = {};
  var args = [].slice.call(arguments);
  args.push(function (err) {
    results.err = err;
  });
  this.dispatch.apply(this, args);
  return results;
};


/**
 * Attempt to match a route for given arguments with optional
 * starting index of `i` defaulting to 0.
 *
 * @param {Object} `state` Object containing current state information (including `args`)
 * @param {Number} `i` The index of the current route.
 * @return {Object} Matching route
 * @api private
 */

Router.prototype._match = function (state, i) {
  var routes = this._routes;
  var route;

  i = i || 0;

  // matching routes
  for (var len = routes.length; i < len; ++i) {
    route = routes[i];
    if (route.match.apply(route, state.args)) {
      state.i = i;
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
