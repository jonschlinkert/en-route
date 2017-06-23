'use strict';

/**
 * Module dependencies.
 */

var debug = require('debug')('en-route:router');
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
  app._params = [];
  app.stack = [];
  app.methods = utils.arrayify(options.methods);

  decorate(app, app.methods);
  return app;
}

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
  // param logic
  if (typeof name === 'function') {
    this._params.push(name);
    return;
  }

  // apply param functions
  var params = this._params;
  var len = params.length;

  if (name[0] === ':') {
    name = name.substr(1);
  }

  for (var i = 0; i < len; ++i) {
    var val = params[i](name, fn);
    if (val) {
      fn = val;
      break;
    }
  }

  // ensure we end up with a middleware function
  if (typeof fn !== 'function') {
    throw new TypeError('invalid param() call for ' + name + ', got ' + fn);
  }

  this.params[name] = this.params[name] || [];
  this.params[name].push(fn);
  return this;
};

/**
 * Dispatch a file into the router.
 *
 * @api private
 */

router.handle = function(file, done) {
  debug('dispatching %s', file.path);
  file.options = file.options || {};

  var self = this;
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
  defineOption(file, 'next', next);

  // setup basic req values
  defineOption(file, 'basePath', parentPath);
  defineOption(file, 'originalPath', file.options.originalPath || file.path);
  next();

  function next(err) {
    var layerError = err === 'route' ? null : err;
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
      done(layerError);
      return;
    }

    self.matchLayer(layer, file, function(err, path) {
      if (err || path === undefined) {
        next(layerError || err);
        return;
      }

      // route object and not middleware
      var route = layer.route;

      // if final route, then we support options
      if (route) {
        // we don't run any routes with error first
        if (layerError) {
          next(layerError);
          return;
        }

        var method = file.options.method;
        var hasMethod = route.hasHandler(method);

        if (!hasMethod) {
          next();
          return;
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
      self.processParams(layer, paramcalled, file, function(err) {
        if (err) {
          next(layerError || err);
          return;
        }

        if (route) {
          layer.handleFile(file, next);
          return;
        }

        trimPrefix(layer, layerError, layerPath, path);
      });
    });
  }

  function trimPrefix(layer, layerError, layerPath, path) {
     // Trim off the part of the path that matches the route
     // middleware (.use stuff) needs to have the path stripped
    if (layerPath.length !== 0) {
      debug('trim prefix (%s) from path %s', layerPath, file.path);
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
      file.options.basePath = parentPath + removedPath;
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

router.matchLayer = function matchLayer(layer, file, cb) {
  try {
    if (!layer.match(file.path)) {
      cb();
    } else {
      cb(null, file.path);
    }
  } catch (err) {
    cb(err);
  }
};

/**
 * Process any parameters for the layer.
 *
 * @api private
 */

router.processParams = function(layer, called, file, cb) {
  var params = this.params;

  // captured parameters from the layer, keys and values
  var keys = utils.arrayify(layer.keys);

  // fast track
  if (keys.length === 0) {
    cb();
    return;
  }

  var i = 0;
  var name;
  var paramIndex = 0;
  var key;
  var paramVal;
  var paramCallbacks;
  var paramCalled;

  // process params in order,
  // callbacks can be async
  function param(err) {
    if (err) {
      cb(err);
      return;
    }

    if (i >= keys.length) {
      cb();
      return;
    }

    paramIndex = 0;
    key = keys[i++];

    if (!key) {
      cb();
      return;
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
  var offset = 0;
  var path = '/';

  // default path to '/', disambiguate router.use([fn])
  if (typeof fn !== 'function') {
    var arg = fn;

    while (Array.isArray(arg) && arg.length !== 0) {
      arg = arg[0];
    }

    // first arg is the path
    if (typeof arg !== 'function') {
      offset = 1;
      path = arg;
    }
  }

  var callbacks = utils.flatten([].slice.call(arguments, offset));
  var len = callbacks.length, i = 0;
  if (len === 0) {
    throw new TypeError('expected middleware functions to be defined');
  }

  while (len--) {
    var cb = callbacks[i++];
    if (typeof cb !== 'function') {
      throw new TypeError('expected callback to be a function, but received: ' + utils.typeOf(cb));
    }

    // add the middleware
    debug('use %s %s', path, cb.name || '<unknown>');

    var layer = new Layer(path, {
      sensitive: this.caseSensitive,
      strict: false,
      end: false
    }, cb);

    layer.route = undefined;
    this.stack.push(layer);
  }

  return this;
};

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

router.method = function(methods) {
  union(this.methods, methods);
  decorate(this, utils.arrayify(methods));
  return this;
};

/**
 * Define a non-enumerable option on the `file` object.
 */

function defineOption(file, key, value) {
  file.options = file.options || {};

  Object.defineProperty(file.options, key, {
    enumerable: false,
    configurable: true,
    set: function(val) {
      value = val;
    },
    get: function() {
      return value;
    }
  });
}

/**
 * Decorate the `router` with the given methods to provide middleware
 * for the router.
 *
 * @param  {Object} `router` Router instance to add methods to.
 * @param  {Array} `methods` Methods to add to the `router`
 * @api private
 */

function decorate(app, methods) {
  var arr = methods.concat('all');
  var len = arr.length, i = 0;

  while (len--) {
    var method = arr[i++];
    app[method] = function(path) {
      var route = this.route(path);
      route[method].apply(route, [].slice.call(arguments, 1));
      return this;
    };
  }
}

// merge params with parent params
function mergeParams(params, parent) {
  if (typeof parent !== 'object' || !parent) {
    return params;
  }

  // make copy of parent for base
  var obj = Object.assign({}, parent);

  // simple non-numeric merging
  if (!(0 in params) || !(0 in parent)) {
    return Object.assign(obj, params);
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

  return Object.assign({}, parent, params);
}

// restore obj props after function
function restore(fn, obj) {
  var len = arguments.length - 2;
  var props = new Array(len);
  var vals = new Array(len);

  for (var i = 0; i < props.length; i++) {
    props[i] = arguments[i + 2];
    vals[i] = obj[props[i]];
  }

  return function(/* err */) {
    // restore vals
    for (var j = 0; j < props.length; j++) {
      obj[props[j]] = vals[j];
    }

    return fn.apply(this, arguments);
  };
}

/**
 * Expose `router`
 */

module.exports = exports = router;
