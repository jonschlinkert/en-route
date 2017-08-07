'use strict';

var debug = require('debug')('en-route:router');
var reduce = require('async-array-reduce');
var define = require('define-property');
var article = require('typeof-article');
var flatten = require('arr-flatten');
var union = require('arr-union');
var Layer = require('./layer');
var Route = require('./route');
var utils = require('./utils');

/**
 * Initialize a new `Router` with the given `methods`.
 *
 * ```js
 * var router = new Router({methods: ['preRender', 'postRender']});
 * ```
 * @name Router
 * @param {Object} `options`
 * @return {Function} Returns a callable router function
 * @api public
 */

function router(options) {
  options = options || {};

  function app(file, next) {
    app.handle(file, next);
  }

  // mixin app class functions
  Object.setPrototypeOf(app, router);
  app.methods = utils.arrayify(options.methods);
  app.params = {};
  app.stack = [];

  app.handlers(app.methods);
  return app;
}

/**
 * Create a new Route for the given path. Each route contains a
 * separate middleware stack.
 *
 * ```js
 * var router = new Router();
 * router.route('/foo')
 *   .all(function(file, next) {
 *     file.contents = new Buffer('foo');
 *     next();
 *   });
 * ```
 * @param {String} `path`
 * @return {Object} `Route` for chaining
 * @api public
 */

router.route = function(path) {
  var route = new Route(path, this.methods);
  var layer = new Layer(path, { end: true }, route.dispatch.bind(route));
  this.stack.push(layer);
  layer.route = route;
  return route;
};

/**
 * Add additional methods to the current router instance.
 *
 * ```js
 * var router = new Router();
 * router.method('post');
 * router.post('.hbs', function(file, next) {
 *   next();
 * });
 * ```
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
 * Add a middleware handler `method` to the instance.
 *
 * ```js
 * router.handler('before');
 * router.handler('after');
 * ```
 * @param {String} `method` The name of the method to add
 * @return {Object} Returns the instance for chaining
 * @api public
 */

router.handler = function(method) {
  if (typeof method !== 'string') {
    throw new TypeError('expected method to be a string');
  }
  this[method] = function(pattern) {
    var route = this.route(pattern);
    route[method].apply(route, [].slice.call(arguments, 1));
    return this;
  };
  return this;
};

/**
 * Add an array of middleware handler `methods` to the instance.
 *
 * ```js
 * router.handlers(['before', 'after']);
 * ```
 * @param {Array} `methods` The method names to add
 * @return {Object} Returns the instance for chaining
 * @api public
 */

router.handlers = function(methods) {
  methods = utils.arrayify(methods);
  for (var i = 0; i < methods.length; i++) {
    this.handler(methods[i]);
  }
  if (typeof this.all !== 'function') {
    this.handler('all');
  }
  return this;
};

/**
 * Dispatch a file into the router.
 *
 * ```js
 * router.dispatch(file, function(err) {
 *   if (err) console.log(err);
 * });
 * ```
 * @param {Object} `file`
 * @param {Function} `callback`
 * @return {undefined}
 * @api public
 */

router.handle = function(file, cb) {
  debug('dispatching %s', file.path);
  file.options = file.options || {};

  // middleware and routes
  var stack = this.stack;
  var slashAdded = false;
  var paramcalled = {};
  var removed = '';

  // manage inter-router variables
  var originalPath = file.options.originalPath || file.path;
  var parentPath = file.options.parentPath || '';
  var method = file.options.method;

  // setup basic req values
  define(file.options, 'originalPath', originalPath);
  define(file.options, 'parentPath', parentPath);

  reduce(stack, [], (acc, layer, next) => {
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
      if (!layer.route.handlesMethod(method)) {
        next(null, file);
        return;
      }

      // we can now dispatch to the route
      file.options.route = layer.route;
    }

    var layerPath = layer.path;

    // this should be done for the layer
    this.processParams(layer, paramcalled, file, function(err, file2) {
      if (err) {
        next(err);
        return;
      }

      if (layer.route) {
        layer.handle(file2, next);
        return;
      }

      // Trim off the part of the path that matches the route
      // middleware (.use stuff) needs to have the path stripped
      removed = layerPath;
      file.path = file.path.slice(removed.length);

      // Ensure leading slash
      if (file.path.charAt(0) !== '/') {
        file.path = '/' + file.path;
        slashAdded = true;
      }

      var rlen = removed.length;
      var removedPath = removed[rlen - 1] === '/'
        ? removed.slice(0, rlen - 1)
        : removed;

      // Setup base path (no trailing slash)
      file.options.parentPath = parentPath + removedPath;
      layer.handle(file2, next);
    });

  }, function(err) {
    cb(err, file);
  });
};

/**
 * Use the given middleware function, with optional path, defaulting to `/`.
 * The other difference is that `route` path is stripped and not visible
 * to the handler function. The main effect of this feature is that mounted
 * handlers can operate without any code changes regardless of the `prefix`
 * pathname.
 *
 * ```js
 * var router = new Router();
 * router.use(function(file, next) {
 *   // do stuff to "file"
 *   next();
 * });
 * ```
 * @param {Function} `fn` Middleware function
 * @return {Object} Router instance for chaining
 * @api public
 */

router.use = function(fn) {
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

    fn = arg;
    if (typeof fn !== 'function') {
      throw new TypeError(expected('function', fn));
    }

    debug('use %s %s', path, fn.name || 'layer');

    // add the middleware
    this.stack.push(new Layer(path, {}, fn));
  }
  return this;
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
 * @param {String} `name` Paramter name
 * @param {Function} `fn`
 * @return {Object} Router instance for chaining
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
 * Process parameters for the given layer.
 */

router.processParams = function(layer, called, file, done) {
  reduce(utils.arrayify(layer.keys), [], (acc, key, cb) => {
    var name = key.name;
    var param = file.options.params[name];
    if (!param) {
      cb(null, file);
      return;
    }

    // captured parameters from the layer, keys and values
    var fns = this.params[name];
    if (!fns) {
      cb(null, file);
      return;
    }

    // restore value if param was previously called with same value
    var prev = called[name];
    if (prev && prev.match === param) {
      file.options.params[name] = prev.value;
      cb(null, file);
      return;
    }

    prev = called[name] = { match: param, value: param };
    prev.value = file.options.params[name];

    reduce(fns, [], function(acc, paramFn, next) {
      try {
        paramFn(file, next, param, name);
      } catch (err) {
        next(err);
      }
    }, cb);

  }, function(err) {
    done(err, file);
  });
};

/**
 * Format error messages
 */

function expected(type, val) {
  return `expected a ${type}, but received ${article(val)}`;
}

/**
 * Expose other classes
 */

router.Layer = Layer;
router.Route = Route;
router.Router = router;

/**
 * Expose `router`
 */

module.exports = exports = router;
