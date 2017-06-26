'use strict';

/**
 * Module dependencies.
 */

var debug = require('debug')('en-route:router');
var reduce = require('async-array-reduce');
var define = require('define-property');
var article = require('typeof-article');
var flatten = require('arr-flatten');
var union = require('arr-union');
var utils = require('./utils');
var Route = require('./route');
var Layer = require('./layer');

/**
 * Initialize a new `Router` with the given `options`.
 *
 * @name Router
 * @param {Object} options
 * @return {Router} which is an callable function
 * @api public
 */

function router(options) {
  options = options || {};

  function app(file, next) {
    app.handle(file, next);
  }

  // mixin app class functions
  Object.setPrototypeOf(app, router);
  app.params = {};
  app.stack = [];
  app.methods = utils.arrayify(options.methods);

  app.handlers(app.methods);
  return app;
}

/**
 * Create a new Route for the given path. Each route contains a
 * separate middleware stack.
 *
 * See the Route api documentation for details on adding handlers
 * and middleware to routes.
 *
 * @param {String} `path`
 * @return {Object} `Route` for chaining
 * @api public
 */

router.route = function(path) {
  var route = new Route(path, this.methods);

  var opts = { sensitive: this.caseSensitive, strict: this.strict, end: true };
  var layer = new Layer(path, opts, route.dispatch.bind(route));

  layer.route = route;
  this.stack.push(layer);
  return route;
};

/**
 * Map the given param placeholder `name`(s) to the given callback.
 *
 * Parameter mapping is used to provide pre-conditions to routes
 * which use normalized placeholders. For example a `:user_id` parameter
 * could automatically load a user's information from the database without
 * any additional code,
 *
 * The callback uses the same signature as middleware, the only difference
 * being that the value of the placeholder is passed, in this case the _id_
 * of the user. Once the `next()` function is invoked, just like middleware
 * it will continue on to execute the route, or subsequent parameter functions.
 *
 * **Example**
 *
 * ```js
 * app.param('user_id', function(file, next, id) {
 *   User.find(id, function(err, user) {
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
 * @return {Router} `Object` for chaining
 * @api public
 */

router.param = function(name, fn) {
  if (name.charAt(0) === ':') {
    name = name.slice(1);
  }

  if (typeof fn !== 'function') {
    throw new TypeError(expected('function', fn));
  }

  this.params[name] = this.params[name] || [];
  this.params[name].push(fn);
  return this;
};

/**
 * Add additional methods to the current router instance.
 *
 * ```
 * var router = new Router();
 * router.method('post');
 * router.post('.hbs', function(file, next) {
 *   next();
 * });
 * ```
 *
 * @param  {String|Array} `methods` New methods to add to the router.
 * @return {Object} the router to enable chaining
 * @api public
 */

router.method = function(method) {
  this.handlers(utils.arrayify(method));
  union(this.methods, method);
  return this;
};

/**
 * Decorate the `router` with the given methods to provide middleware
 * for the router.
 *
 * @param  {Object} `router` Router instance to add methods to.
 * @param  {Array} `methods` Methods to add to the `router`
 * @api private
 */

router.handler = function(method) {
  this[method] = function(path) {
    var route = this.route(path);
    route[method].apply(route, [].slice.call(arguments, 1));
    return this;
  };
};

router.handlers = function(methods) {
  var arr = methods.concat('all');
  for (var i = 0; i < arr.length; i++) {
    this.handler(arr[i]);
  }
};

/**
 * Dispatch a file into the router.
 *
 * @api private
 */

router.handle = function(file, cb) {
  debug('dispatching %s', file.path);
  file.options = file.options || {};

  // middleware and routes
  var stack = this.stack;
  var paramcalled = {};
  var slashAdded = false;
  var removed = '';
  var self = this;

  // manage inter-router variables
  var originalPath = file.options.originalPath || file.path;
  var parentPath = file.options.parentPath || '';

  // setup basic req values
  define(file.options, 'originalPath', originalPath);
  define(file.options, 'parentPath', parentPath);

  reduce(stack, [], function(acc, layer, next) {
    if (slashAdded) {
      file.path = file.path.slice(1);
      slashAdded = false;
    }

    if (removed.length !== 0) {
      file.options.parentPath = parentPath;
      file.path = removed + file.path;
      removed = '';
    }

    if (!layer.match(file.path)) {
      next(null, file);
      return;
    }

    // Capture one-time layer values
    file.options.params = layer.params;

    // if final route, then we support options
    if (layer.route) {
      if (!layer.route.hasHandler(file.options.method)) {
        next(null, file);
        return;
      }
      // we can now dispatch to the route
      file.options.route = layer.route;
    }

    var layerPath = layer.path;

    // this should be done for the layer
    self.processParams(layer, paramcalled, file, function(err) {
      if (err) {
        next(err);
        return;
      }

      if (layer.route) {
        layer.handleFile(file, next);
        return;
      }

      trimPrefix(layer, layerPath, layer.path);
      layer.handleFile(file, next);
    });

    function trimPrefix(layer, layerPath, path) {
      debug('trim prefix (%s) from path %s', layerPath, file.path);

       // Trim off the part of the path that matches the route
       // middleware (.use stuff) needs to have the path stripped
      removed = layerPath;
      file.path = file.path.substr(removed.length);

      // Ensure leading slash
      if (file.path.charAt(0) !== '/') {
        file.path = '/' + file.path;
        slashAdded = true;
      }

      var rlen = removed.length;
      var removedPath = removed[rlen - 1] === '/'
        ? removed.substring(0, rlen - 1)
        : removed;

      // Setup base path (no trailing slash)
      file.options.parentPath = parentPath + removedPath;
    }

  }, function(err) {
    cb(err, file);
  });
};

/**
 * Process any parameters for the layer.
 *
 * @api private
 */

router.processParams = function(layer, called, file, cb) {
  // captured parameters from the layer, keys and values
  var keys = utils.arrayify(layer.keys);
  var len = keys.length;

  // if no keys, call back
  if (len === 0) {
    cb(null, file);
    return;
  }

  var params = this.params;
  var idx = 0;

  // process params in order, callbacks can be async
  (function next(err) {
    if (err) {
      cb(err);
      return;
    }

    if (len < idx) {
      cb(null, file);
      return;
    }

    var key = keys[idx++];
    if (!key) {
      cb(null, file);
      return;
    }

    var name = key.name;
    var param = file.options.params[name];
    var paramCalled = called[name];
    var callbacks = params[name];
    paramIdx = 0;

    if (param == null || !callbacks) {
      next(null, file);
      return;
    }

    // param previously called with same value or error occurred
    if (paramCalled && paramCalled.match === param) {
      // restore value
      file.options.params[name] = paramCalled.value;
      next(null, file);
      return;
    }

    called[name] = paramCalled = {
      match: param,
      value: param
    };

    paramCalled.value = file.options.params[name];

    reduce(callbacks, [], function(acc, paramFn, callback) {
      try {
        paramFn(file, callback, param, name);
      } catch (err) {
        callback(err);
      }
    }, function(err) {
      next(err, file);
    });
  }());
};

/**
 * Use the given middleware function, with optional path, defaulting to `/`.
 *
 * The other difference is that `route` path is stripped and not visible
 * to the handler function. The main effect of this feature is that mounted
 * handlers can operate without any code changes regardless of the `prefix`
 * pathname.
 *
 * ```js
 * var router = new Router();
 *
 * router.use(function(file, next) {
 *   false.should.be.true;
 *   next();
 * });
 * ```
 * @param {Function} `fn`
 * @api public
 */

router.use = function use(fn) {
  var args = flatten([].slice.call(arguments));
  var len = args.length;
  var path = '/';

  if (len === 0) {
    throw new TypeError('expected arguments to be middleware functions');
  }

  for (var i = 0; i < len; i++) {
    var arg = args[i];

    if (typeof arg === 'string' && i === 0) {
      path = arg;
      continue;
    }

    var cb = arg;
    if (typeof cb !== 'function') {
      throw new TypeError(expected('function', cb));
    }

    debug('use %s %s', path, cb.name || 'layer');

    // add the middleware
    var layer = new Layer(path, {
      sensitive: this.caseSensitive,
      strict: false,
      end: false
    }, cb);

    this.stack.push(layer);
  }

  return this;
};

/**
 * Format error messages
 */

function expected(type, val) {
  return `expected a ${type}, but received ${article(val)}`;
}

/**
 * Expose `router`
 */

module.exports = exports = router;
