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
  this._stages = {};
};


/**
 * Create a route for a `filter` that will call a `middleware` stack when the `filter` is matched.
 *
 * ```js
 * // using a filepath as the filter
 * router.route('/path/to/:filename.md', function (key, value, next) {
 *   // process value
 *   value.content = markdown(value.content);
 *   value.options.ext = '.html'
 *
 *   // use the params from the filepath (:filename)
 *   console.log(this.params.filename);
 *
 *   // done, so call the next middleware
 *   next();
 * });
 *
 * // using a function as the filter
 * router.route(function (key, value) {
 *   // only process files that are not drafts
 *   return (!('drafts' in value.data) || (!value.data.draft && value.data.draft === false));
 * }, function (key, value, next) {
 *   // process value
 *   // done, so call the next middleware
 *   next();
 * });
 * ```
 *
 * @param {Function|String} `filter` Either a string to match on or a function that filters.
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
 * Call the dispatcher on on arguments
 *
 * ```js
 * var page = {
 *   path: 'some/file/path.md',
 *   data: {
 *     draft: false
 *   },
 *   options: {
 *     ext: '.md'
 *   }
 * };
 * router.middleware(page.path, page, function (err) {
 *   if (err) {
 *     // something bad happened
 *   }
 *   // everything is good
 * });
 * ```
 *
 * @param {arguments} `arguments` Any arguments are passed through the dispatcher. The arguments must match the arguments expected by the filter and middleware.
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
      debug('state.i = %s', state.i);
      dispatch(state.i + 1, err);
    }

    // match route
    var route = self._match(state, i);

    // no route
    if (!route) {
      return next(err);
    }

    if (route instanceof Error) {
      return next(route);
    }
    
    debug('matched %j', route);
    state.params = route.params;

    // invoke route callbacks
    var j = 0;

    function callbacks(err) {
      var fn = route.handle[j++];
      var fnArgs = utils.getParamNames(fn || function () {});
      debug('fnArgs', fnArgs);
      var errorHandler = (fn && (fnArgs[0] === 'err' || fnArgs[0] === 'error')) ? fn : null;

      try {
        if (err === 'route') {
          // middleware called `next('route')`
          debug('err === "route"');
          nextRoute();
        } else if (err && fn) {

          if (errorHandler) {
            errorHandler.apply(route, [err].concat(state.args.concat(callbacks)));
          } else {
            callbacks(err);
          }

        } else if (fn) {
          // `fn` is a middleware, if it matches the arguments, then call it
          debug('fn', fn.length, state.args.length);
          if (fn.length === state.args.length + 1) {
            debug('applying %s', fn.name || 'anonymous');
            return fn.apply(route, state.args.concat(callbacks));
          }
          callbacks();
        } else {
          debug('nextRoute', err);
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
    try {
      if (route.match.apply(route, state.args)) {
        state.i = i;
        return route;
      }
    } catch (err) {
      debug('#_match:err', err);
      return err;
    }
  }
};


/**
 * Utilize the given middleware `fn` to the given `stage`,
 * defaulting to `_*_`.
 *
 * **Example:**
 *
 * ```js
 * router.use('init', function (a, b, next) {
 *   a.foo = {};
 *   b.bar = {};
 *   next();
 * });
 * ```
 *
 * @param {String} `stage` Stage for when this middleware should be called
 * @param {Function} `fn` Additional middleware functions to call during the stage
 * @return {Router} for chaining.
 * @api public
 */

Router.prototype.use = function (stage) {
  var fns = _.flatten([].slice.call(arguments));
  if (typeof stage === 'string') {
    debug('stage %s', stage);
    fns.shift();
  } else {
    stage = '*';
  }

  fns.forEach(function (fn) {
    if (typeof fn !== 'function') {
      var type = {}.toString.call(fn);
      var msg = 'Router.use() requires callback functions but got a ' + type;
      throw new Error(msg);
    }

    // add the middleware
    debug('use %s %s', stage, fn.name || 'anonymous');
    if (!this._stages[stage]) {
      this._stages[stage] = [];
    }
    this._stages[stage].push({stage: stage, handle: fn});
  }.bind(this));

  debug('new stages', this._stages[stage]);
  return this;
};


/**
 * Stage middleware dispatcher
 *
 * @param {String} `stage` stage to dispatch
 * @param {Arguments} `arguments` additional arguments to dispatch to stage middleware
 * @param {Function} `next` Callback
 * @api private
 */

Router.prototype.stage = function () {
  debug('dispatching ', arguments);
  var self = this;
  var args = [].slice.call(arguments);
  var stage = args.shift();
  var cb = args.pop();
  var state = {
    args: args,
    i: 0
  };

  if (typeof stage !== 'string') {
    var type = {}.toString.call(stage);
    var msg = 'Router.stage() requires a stage specified as a string, but received ' + type;
    throw new Error(msg);
  }

  // when finished calling stage middleware, dispatch to regular routes
  var done = function (err) {
    if (err) {
      return cb(err);
    }
    self.dispatch.apply(self, state.args.concat(cb));
  };

  // find the stages to use
  var stages = this._stages['*'] || [];
  if (stage !== '*') {
    stages = stages.concat(this._stages[stage] || []);
  }
  debug('stages', stages);

  // recursive function to call all routes
  var next = function (err) {

    var route = stages[state.i++];
    debug('route', route);

    // return when we're finished calling all stage routes
    if (!route) {
      return done(err);
    }

    // get the handler and determine if it's an error handler
    var fn = route.handle;
    var fnArgs = utils.getParamNames(fn || function () {});
    debug('fnArgs', fnArgs);
    var errorHandler = (fn && (fnArgs[0] === 'err' || fnArgs[0] === 'error')) ? fn : null;

    try {
      if (err === 'route') {
        // middleware called `next('route')`
        debug('err === "route"');
        next();
      } else if (err && fn) {

        if (errorHandler) {
          errorHandler.apply(route, [err].concat(state.args.concat(next)));
        } else {
          next(err);
        }

      } else if (fn) {
        // `fn` is a middleware, if it matches the arguments, then call it
        debug('fn', fn.length, state.args.length);
        if (fn.length === state.args.length + 1) {
          debug('applying %s', fn.name || 'anonymous');
          return fn.apply(route, state.args.concat(next));
        }
        next();
      } else {
        debug('next', err);
        next(err);
      }

    } catch (err) {
      next(err);
    }

  }
  return next(null);

};
