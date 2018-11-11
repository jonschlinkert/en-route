'use strict';

const Emitter = require('events');
const define = require('./define');
const Route = require('./route');

/**
 * Create a new `Router` with the given options.
 *
 * ```js
 * // initialize a router with handler methdods
 * const router = new Router({ handlers: ['preWrite', 'postWrite'] });
 * ```
 * @name Router
 * @extends {Class} EventEmitter
 * @param {object} `options`
 * @api public
 */

class Router extends Emitter {
  constructor(options = {}) {
    super();
    this.options = options;
    this.methods = new Set();
    this.routes = new Map();
    this.handlers(this.options.handlers);

    if (this.options.sync) {
      this.handle = handle.bind(null, this);
      this.all = all.bind(null, this);
    }
  }

  /**
   * Register one or more middleware handler methods. Handler methods may also be
   * added by passing an array of handler names to the constructor on the
   * `handlers` option.
   *
   * ```js
   * router.handlers(['onLoad', 'preRender']);
   * ```
   * @name .handlers
   * @param {string} `methods` Method names
   * @param {object} `options`
   * @return {object} Returns the instance for chaining.
   * @api public
   */

  handlers(methods) {
    arrayify(methods).forEach(name => this.handler(name));
    return this;
  }

  /**
   * Register a middleware handler method.
   *
   * ```js
   * router.handler('onLoad');
   * ```
   * @name .handler
   * @param {string} `method` Method name
   * @param {object} `options`
   * @return {object} Returns the instance for chaining.
   * @api public
   */

  handler(method) {
    if (Array.isArray(method)) return this.handlers(method);
    if (!this.routes.has(method)) this.routes.set(method, new Set());

    if (typeof method !== 'string') {
      throw new TypeError('expected handler method name to be a string');
    }

    let stack = this.routes.get(method);
    let handler = (pattern, ...fns) => {
      if (Array.isArray(pattern) && typeof pattern[0] !== 'function') {
        pattern.forEach(p => handler(p, ...fns));
        return this;
      }

      if (!fns.every(fn => typeof fn === 'function')) {
        throw new TypeError(`expected "${method}" handlers to be functions`);
      }

      let route = new Route(pattern, fns, this.options);
      route.on('layer', this.emit.bind(this, 'layer', method));
      route.on('handle', file => {
        this.emit('handle', method, file, route);
        this.emit(method, file, route);
      });
      stack.add(route);
      return this;
    };

    define(this, method, handler);
    this.methods.add(method);
    this.emit('handler', method, handler);
    return handler;
  }

  /**
   * Create a new router instance with all handler methods bound to the given pattern.
   *
   * ```js
   * const router = new Router({ handlers: ['before', 'after'] });
   * const file = { path: '/foo', content: '' };
   *
   * router.route('/foo')
   *   .before(function(file) {
   *     file.content += 'foo';
   *   })
   *   .after(function(file) {
   *     file.content += 'bar';
   *   });
   *
   * router.handle(file)
   *   .then(() => {
   *     assert.equal(file.content, 'foobar');
   *   });
   * ```
   * @name .route
   * @param {string} `pattern`
   * @param {object} `options` Options to pass to new router.
   * @return {object} Returns a new router instance with handler methods bound to the given pattern.
   * @api public
   */

  route(pattern, options) {
    let router = new Router(options);
    for (let key of this.methods) {
      define(router, key, (...fns) => router.handler(key)(pattern, ...fns));
    }
    return router;
  }

  /**
   * Run a middleware methods on the given `file`.
   *
   * ```js
   * // run a specific method
   * router.handle('onLoad', file)
   *   .then(file => console.log('File:', file))
   *   .catch(console.error);
   *
   * // run multiple methods
   * router.handle('onLoad', file)
   *   .then(file => router.handle('preRender', file))
   *   .catch(console.error);
   *
   * // run all methods
   * router.handle(file)
   *   .then(file => console.log('File:', file))
   *   .catch(console.error);
   * ```
   * @name .handle
   * @param {string|file} `method` The handler method to call on `file`. If the first argument is a file object, all handlers will be called on the file.
   * @param {object} `file` File object
   * @return {Promise}
   * @api public
   */

  async handle(method, file) {
    if (method && typeof method === 'object') return this.all(method);
    if (!this.routes.has(method)) {
      throw new Error(`Router handler "${method}" does not exist`);
    }

    let arr = [];
    for (let route of this.routes.get(method)) {
      if (this.options.parallel) {
        arr.push(route.handle(file));
      } else {
        await route.handle(file);
      }
    }

    if (this.options.parallel) await Promise.all(arr);
    return file;
  }

  /**
   * Runs all handler methods on the given file, in series.
   *
   * ```js
   * router.all(file => {
   *   file.data.title = 'Home';
   * });
   * ```
   * @name .all
   * @param {object} `file` File object
   * @return {Promise}
   * @api public
   */

  async all(file) {
    let arr = [];
    for (let method of this.methods) {
      if (this.options.parallel) {
        arr.push(this.handle(method, file));
      } else {
        await this.handle(method, file);
      }
    }
    if (this.options.parallel) {
      await Promise.all(arr);
    }
    return file;
  }

  /**
   * Mix router methods onto the given object.
   *
   * ```js
   * const router = new Router();
   * const obj = {};
   * router.handlers(['before', 'after']);
   * router.mixin(obj);
   * console.log(obj.before) //=> [function]
   * ```
   * @name .mixin
   * @param {object} `target`
   * @return {undefined}
   * @api public
   */

  mixin(target) {
    define(target, 'all', this.all.bind(this));
    for (let name of this.methods) {
      define(target, name, this[name].bind(this));
    }
    return this;
  }
}

/**
 * Sync methods
 */

function handle(router, method, file) {
  if (method && typeof method === 'object') return router.all(method);
  if (!router.routes.has(method)) {
    throw new Error(`Router handler "${method}" does not exist`);
  }
  for (let route of router.routes.get(method)) route.handle(file);
  return file;
}

function all(router, file) {
  for (let method of router.methods) router.handle(method, file);
  return file;
}

/**
 * Cast `val` to an array
 */

function arrayify(val) {
  return val ? Array.isArray(val) ? val : [val] : [];
}

/**
 * Expose `Router`
 */

module.exports = Router;
