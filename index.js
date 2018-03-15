'use strict';

const debug = require('debug')('en-route:router');
const reduce = require('async-array-reduce');
const article = require('typeof-article');
const flatten = require('arr-flatten');
const Layer = require('./lib/layer');
const Route = require('./lib/route');
const utils = require('./lib/utils');

/**
 * Initialize a new `Router` with the given `methods`.
 *
 * ```js
 * const router = new Router({methods: ['preRender', 'postRender']});
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
 * const router = new Router();
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
  const route = new Route(path, this.methods);
  const layer = new Layer(path, { end: true }, route.dispatch.bind(route));
  this.stack.push(layer);
  layer.route = route;
  return route;
};

/**
 * Add additional methods to the current router instance.
 *
 * ```js
 * const router = new Router();
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
  if (this.methods.indexOf(method) === -1) {
    this.methods.push(method);
  }
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
  this[method] = (path, ...rest) => this.route(path)[method](...rest);
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
  utils.arrayify(methods).forEach(m => this.handler(m));

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

router.handle = function(method, file, cb) {
  if (typeof method !== 'string') {
    cb = file;
    file = method;
    method = null;
  }

  debug('dispatching %s', file.path);

  if (!file.routes) {
    file.routes = {};
  } else if (!method) {
    method = file.routes.method;
  }

  // middleware and routes
  const stack = this.stack;
  const paramcalled = {};
  let slashAdded = false;
  let removed = '';

  // manage inter-router variables
  const originalPath = file.routes.originalPath || file.path;
  const parentPath = file.routes.parentPath || '';

  // setup basic req values
  utils.define(file.routes, 'originalPath', originalPath);
  utils.define(file.routes, 'parentPath', parentPath);

  reduce(stack, [], (acc, layer, next) => {
    if (slashAdded) {
      file.path = file.path.slice(1);
      slashAdded = false;
    }

    if (removed.length !== 0) {
      file.routes.parentPath = parentPath;
      file.path = removed + file.path;
      removed = '';
    }

    if (!layer.match(file.path)) {
      next(null, file);
      return;
    }

    // Capture one-time layer values
    file.routes.params = layer.params;

    // if final route, then we support options
    if (layer.route) {
      if (!layer.route.handlesMethod(method)) {
        next(null, file);
        return;
      }

      // we can now dispatch to the route
      file.routes.route = layer.route;
    }

    const layerPath = layer.path;

    // this should be done for the layer
    this.processParams(layer, paramcalled, file, err => {
      if (err) {
        next(err);
        return;
      }

      if (layer.route) {
        layer.handle(file, next);
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

      const rlen = removed.length;
      const removedPath = removed[rlen - 1] === '/'
        ? removed.slice(0, rlen - 1)
        : removed;

      // Setup base path (no trailing slash)
      file.routes.parentPath = parentPath + removedPath;
      layer.handle(file, next);
    });

  }, err => {
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
 * const router = new Router();
 * router.use(function(file, next) {
 *   // do stuff to "file"
 *   next();
 * });
 * ```
 * @param {Function} `fn` Middleware function
 * @return {Object} Router instance for chaining
 * @api public
 */

router.use = function(...args) {
  let path = '/';
  let i = 0;

  if (args.length === 0) {
    throw new TypeError('expected arguments to be middleware functions');
  }

  for (const arg of flatten(args)) {
    if (i++ === 0 && typeof arg === 'string') {
      path = arg;
      continue;
    }

    if (typeof arg !== 'function') {
      throw new TypeError(expected('function', arg));
    }

    debug('use %s %s', path, arg.name || 'layer');
    this.stack.push(new Layer(path, {}, arg));
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
  if (name.charAt(0) === ':') name = name.slice(1);
  this.params[name] = this.params[name] || [];
  this.params[name].push(fn);
  return this;
};

/**
 * Process parameters for the given layer.
 */

router.processParams = function(layer, called, file, callback) {
  reduce(utils.arrayify(layer.keys), [], (acc, key, cb) => {
    const name = key.name;
    const param = file.routes.params[name];

    if (!param) {
      cb(null, file);
      return;
    }

    // captured parameters from the layer, keys and values
    const fns = this.params[name];
    if (!fns) {
      cb(null, file);
      return;
    }

    // restore value if param was previously called with same value
    let prev = called[name];
    if (prev && prev.match === param) {
      file.routes.params[name] = prev.value;
      cb(null, file);
      return;
    }

    prev = called[name] = { match: param, value: param };
    prev.value = file.routes.params[name];

    reduce(fns, [], (acc, paramFn, next) => {
      try {
        paramFn(file, next, param, name);
      } catch (err) {
        next(err);
      }
    }, cb);

  }, err => {
    callback(err, file);
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

module.exports = router;
