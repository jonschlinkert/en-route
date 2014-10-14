'use strict';

var Route = require('./layer');
var debug = require('debug')('router');
var _ = require('lodash');


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
 * Map the given param placeholder `name`(s) to the given callback.
 *
 * Parameter mapping is used to provide pre-conditions to routes
 * which use normalized placeholders. For example a _:user_id_ parameter
 * could automatically load a user's information from the database without
 * any additional code,
 *
 * The callback uses the same signature as middleware, the only difference
 * being that the value of the placeholder is passed, in this case the _id_
 * of the user. Once the `next()` function is invoked, just like middleware
 * it will continue on to execute the route, or subsequent parameter functions.
 *
 * Just like in middleware, you must either respond to the request or call next
 * to avoid stalling the request.
 *
 * ```js
 * app.param('user_id', function (file, next, id) {
 *   User.find(id, function (err, user) {
 *     if (err) {
 *       return next(err);
 *     } else if (!user) {
 *       return next(new Error('failed to load user'));
 *     }
 *     file.user = user;
 *     next();
 *   });
 * });
 * ```
 *
 * @param {String} `name`
 * @param {Function} `fn`
 * @return {app} for chaining
 * @api public
 */

Router.prototype.param = function(name, fn){
  // param logic
  if (typeof name === 'function') {
    this._params.push(name);
    return;
  }

  // apply param functions
  var params = this._params;
  var len = params.length;
  var ret;

  if (name[0] === ':') {
    name = name.substr(1);
  }

  for (var i = 0; i < len; ++i) {
    if (ret = params[i](name, fn)) {
      fn = ret;
    }
  }

  // ensure we end up with a middleware function
  if (typeof fn !== 'function') {
    throw new Error('invalid param() call for ' + name + ', got ' + fn);
  }

  (this.params[name] = this.params[name] || []).push(fn);
  return this;
};


/**
 * Call the dispatcher on a `file` object.
 *
 * @param {Object} `file` File object.
 * @param {Function} `next` Callback.
 * @return {Object}
 * @api public
 */

Router.prototype.middleware = function(file, next) {
  this.dispatch.call(this, file, next);
};


/**
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
 * Route `filepath` to one or more callbacks.
 *
 * @param {String} `filepath`
 * @param {Function|Array} `middleware` Middleware stack.
 * @return {Object}
 * @api public
 */

Router.prototype.route = function(filepath, middleware) {
  var fns = _.flatten([].slice.call(arguments, 1));
  debug('route %s', filepath);

  var route = new Route(filepath, fns, this.options);
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

Router.prototype.dispatch = function(file, next) {
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
 * Attempt to match a route for `file` with optional
 * starting index of `i` defaulting to 0.
 *
 * @param {String} `file`
 * @param {Number} `i` The index of the current file.
 * @return {route} Matching routes.
 * @api private
 */

Router.prototype._match = function(file, i) {
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

Router.prototype.use = function(route, fn) {
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
