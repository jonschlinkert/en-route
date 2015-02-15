'use strict';

/**
 * Module dependencies.
 */

var slice = require('array-slice');
var flatten = require('arr-flatten');
var typeOf = require('kind-of');
var mixin = require('utils-merge');
var debug = require('debug')('router');
var Route = require('./route');
var Layer = require('./layer');

/**
 * Initialize a new `Router` with the given `options`.
 *
 * @param {Object} options
 * @return {Router} which is an callable function
 * @api public
 */

var proto = module.exports = function proto(options) {
  options = options || {};

  function router(file, next) {
    router.handle(file, next);
  }

  // mixin Router class functions
  router.__proto__ = proto;

  router.params = {};
  router._params = [];
  router.caseSensitive = options.caseSensitive;
  router.mergeParams = options.mergeParams;
  router.strict = options.strict;
  router.stack = [];
  router.methods = !Array.isArray(options.methods)
    ? ((options.methods && [options.methods]) || [])
    : options.methods;

  decorate(router, router.methods);
  return router;
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
 * @return {app} for chaining
 * @api public
 */

proto.param = function(name, fn) {
  // param logic
  if ('function' == typeof name) {
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
  if ('function' != typeof fn) {
    throw new Error('invalid param() call for ' + name + ', got ' + fn);
  }

  (this.params[name] = this.params[name] || []).push(fn);
  return this;
};

/**
 * Dispatch a file into the router.
 *
 * @api private
 */

proto.handle = function(file, done) {
  var self = this;
  file.options = file.options || {};

  debug('dispatching %s', file.path);

  var idx = 0;
  var removed = '';
  var slashAdded = false;
  var paramcalled = {};

  // middleware and routes
  var stack = self.stack;

  // manage inter-router variables
  var parentParams = file.options.params;
  var parentPath = file.options.basePath || '';
  done = restore(done, file.options, 'basePath', 'next', 'params');

  // setup next layer
  file.options.next = next;

  // setup basic req values
  file.options.basePath = parentPath;
  file.options.originalPath = file.options.originalPath || file.path;

  next();

  function next(err) {
    var layerError = err === 'route'
      ? null
      : err;

    var layer = stack[idx++];

    if (slashAdded) {
      file.path = file.path.substr(1);
      slashAdded = false;
    }

    if (removed.length !== 0) {
      file.options.basePath = parentPath;
      file.path = removed + file.path;
      removed = '';
    }

    if (!layer) {
      return done(layerError);
    }

    self.matchLayer(layer, file, function (err, path) {
      if (err || path === undefined) {
        return next(layerError || err);
      }

      // route object and not middleware
      var route = layer.route;

      // if final route, then we support options
      if (route) {
        // we don't run any routes with error first
        if (layerError) {
          return next(layerError);
        }

        var method = file.options.method;
        var hasMethod = route.handlesMethod(method);

        if (!hasMethod) {
          return next();
        }

        // we can now dispatch to the route
        file.options.route = route;
      }

      // Capture one-time layer values
      file.options.params = self.mergeParams
        ? mergeParams(layer.params, parentParams)
        : layer.params;

      var layerPath = layer.path;

      // this should be done for the layer
      self.processParams(layer, paramcalled, file, function (err) {
        if (err) {
          return next(layerError || err);
        }

        if (route) {
          return layer.handleFile(file, next);
        }

        trimPrefix(layer, layerError, layerPath, path);
      });
    });
  }

  function trimPrefix(layer, layerError, layerPath, path) {
    var c = path[layerPath.length];
    // if (c && '/' !== c && '.' !== c) return next(layerError);

     // Trim off the part of the path that matches the route
     // middleware (.use stuff) needs to have the path stripped
    if (layerPath.length !== 0) {
      debug('trim prefix (%s) from path %s', layerPath, file.path);
      removed = layerPath;
      file.path = file.path.substr(removed.length);

      // Ensure leading slash
      if (file.path[0] !== '/') {
        file.path = '/' + file.path;
        slashAdded = true;
      }

      // Setup base path (no trailing slash)
      file.options.basePath = parentPath + (removed[removed.length - 1] === '/'
        ? removed.substring(0, removed.length - 1)
        : removed);
    }

    debug('%s %s : %s', layer.name, layerPath, file.options.originalPath);

    if (layerError) {
      layer.handleError(layerError, file, next);
    } else {
      layer.handleFile(file, next);
    }
  }
};

/**
 * Match file to a layer.
 *
 * @api private
 */

proto.matchLayer = function matchLayer(layer, file, done) {
  var error = null;
  var path;

  try {
    path = file.path;
    if (!layer.match(path)) {
      path = undefined;
    }
  } catch (err) {
    error = err;
  }
  done(error, path);
};

/**
 * Process any parameters for the layer.
 *
 * @api private
 */

proto.processParams = function(layer, called, file, done) {
  var params = this.params;

  // captured parameters from the layer, keys and values
  var keys = layer.keys;

  // fast track
  if (!keys || keys.length === 0) {
    return done();
  }

  var i = 0;
  var name;
  var paramIndex = 0;
  var key;
  var paramVal;
  var paramCallbacks;
  var paramCalled;

  // process params in order
  // param callbacks can be async
  function param(err) {
    if (err) {
      return done(err);
    }

    if (i >= keys.length ) {
      return done();
    }

    paramIndex = 0;
    key = keys[i++];

    if (!key) {
      return done();
    }

    name = key.name;
    paramVal = file.options.params[name];
    paramCallbacks = params[name];
    paramCalled = called[name];

    if (paramVal === undefined || !paramCallbacks) {
      return param();
    }

    // param previously called with same value or error occurred
    if (paramCalled && (paramCalled.error || paramCalled.match === paramVal)) {
      // restore value
      file.options.params[name] = paramCalled.value;

      // next param
      return param(paramCalled.error);
    }

    called[name] = paramCalled = {
      error: null,
      match: paramVal,
      value: paramVal
    };

    paramCallback();
  }

  // single param callbacks
  function paramCallback(err) {
    var fn = paramCallbacks[paramIndex++];

    // store updated value
    paramCalled.value = file.options.params[key.name];

    if (err) {
      // store error
      paramCalled.error = err;
      param(err);
      return;
    }

    if (!fn) return param();

    try {
      fn(file, paramCallback, paramVal, key.name);
    } catch (e) {
      paramCallback(e);
    }
  }

  param();
};

/**
 * Use the given middleware function, with optional path, defaulting to "/".
 *
 * The other difference is that _route_ path is stripped and not visible
 * to the handler function. The main effect of this feature is that mounted
 * handlers can operate without any code changes regardless of the "prefix"
 * pathname.
 *
 * @param {Function} `fn`
 * @api public
 */

proto.use = function use(fn) {
  var offset = 0;
  var path = '/';

  // default path to '/'
  // disambiguate router.use([fn])
  if (typeof fn !== 'function') {
    var arg = fn;

    while (Array.isArray(arg) && arg.length !== 0) {
      arg = arg[0];
    }

    // first arg is the path
    if (typeof arg !== 'function') {
      offset = 1;
      path = fn;
    }
  }

  var callbacks = flatten(slice(arguments, offset));
  if (callbacks.length === 0) {
    throw new TypeError('Router#use() requires middleware functions');
  }

  callbacks.forEach(function (fn) {
    if (typeof fn !== 'function') {
      throw new TypeError('Router#use() requires middleware function but got: ' + typeOf(fn));
    }

    // add the middleware
    debug('use %s %s', path, fn.name || '<anonymous>');

    var layer = new Layer(path, {
      sensitive: this.caseSensitive,
      strict: false,
      end: false
    }, fn);

    layer.route = undefined;

    this.stack.push(layer);
  }, this);
  return this;
};

/**
 * Create a new Route for the given path.
 *
 * Each route contains a separate middleware stack.
 *
 * See the Route api documentation for details on adding handlers
 * and middleware to routes.
 *
 * @param {String} path
 * @return {Route}
 * @api public
 */

proto.route = function(path) {
  var route = new Route(path, this.methods);

  var layer = new Layer(path, {
    sensitive: this.caseSensitive,
    strict: this.strict,
    end: true
  }, route.dispatch.bind(route));

  layer.route = route;

  this.stack.push(layer);
  return route;
};

/**
 * Decorate the `router` with the given methods to provide middleware
 * for the router.
 *
 * @param  {Object} `router` Router instance to add methods to.
 * @param  {Array} `methods` Methods to add to the `router`
 * @api private
 */

var decorate = function (router, methods) {
  methods.concat(['all']).forEach(function(method) {
    router[method] = function(path) {
      var route = this.route(path);
      route[method].apply(route, slice(arguments, 1));
      return this;
    };
  });
};


// merge params with parent params
function mergeParams(params, parent) {
  if (typeof parent !== 'object' || !parent) {
    return params;
  }

  // make copy of parent for base
  var obj = mixin({}, parent);

  // simple non-numeric merging
  if (!(0 in params) || !(0 in parent)) {
    return mixin(obj, params);
  }

  var i = 0;
  var o = 0;

  // determine numeric gaps
  while (i === o || o in parent) {
    if (i in params) i++;
    if (o in parent) o++;
  }

  // offset numeric indices in params before merge
  for (i--; i >= 0; i--) {
    params[i + o] = params[i];

    // create holes for the merge when necessary
    if (i < o) {
      delete params[i];
    }
  }

  return mixin(parent, params);
}

// restore obj props after function
function restore(fn, obj) {
  var props = new Array(arguments.length - 2);
  var vals = new Array(arguments.length - 2);

  for (var i = 0; i < props.length; i++) {
    props[i] = arguments[i + 2];
    vals[i] = obj[props[i]];
  }

  return function(err) {
    // restore vals
    for (var i = 0; i < props.length; i++) {
      obj[props[i]] = vals[i];
    }
    return fn.apply(this, arguments);
  };
}
