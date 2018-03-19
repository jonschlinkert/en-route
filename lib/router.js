'use strict';

const Emitter = require('@sellside/emitter');
const define = require('./define');
const Route = require('./route');

/**
 * Create a new Router with the given options.
 * @name Router
 * @extends {Class} Emitter
 * @param {Object} `options`
 * @api public
 */

class Router extends Emitter {
  constructor(options = {}) {
    super();
    this.options = options;
    this.methods = new Set();
    this.routes = new Map();
    this.handlers(this.options.handlers, this.options);
  }

  /**
   * Create a middleware handler method.
   * @name .handler
   * @param {String} `method` Method name
   * @param {Object} `options`
   * @return {Object} Returns the instance for chaining.
   * @api public
   */

  handler(method, options) {
    if (Array.isArray(method)) return this.handlers(method, options);
    if (!this.routes.has(method)) this.routes.set(method, new Set());

    if (typeof method !== 'string') {
      throw new TypeError('expected handler method name to be a string');
    }

    const opts = Object.assign({}, this.options, options);
    const stack = this.routes.get(method);

    const handler = (pattern, ...fns) => {
      const route = new Route(pattern, fns, opts);
      route.on('layer', this.emit.bind(this, 'layer', method));
      route.on('handle', file => {
        this.emit('handle', method, file, route);
        this.emit(method, file, route);
      });
      stack.add(route);
      return this;
    };

    define(this, method, handler);
    this.emit('handler', method, handler);
    this.methods.add(method);
    return this;
  }

  /**
   * Add one or more middleware handler methods. Handler methods may also be
   * added by passing an array of handler names to the constructor on the
   * `handlers` option.
   *
   * ```js
   * router.handlers(['onLoad', 'preRender']);
   * ```
   * @name .handlers
   * @param {String} `methods` Method names
   * @param {Object} `options`
   * @return {Object} Returns the instance for chaining.
   * @api public
   */

  route(pattern) {
    const router = new Router();
    for (const key of this.methods) {
      router[key] = this[key].bind(null, pattern);
    }
    return router;
  }

  /**
   * Add one or more middleware handler methods. Handler methods may also be
   * added by passing an array of handler names to the constructor on the
   * `handlers` option.
   *
   * ```js
   * router.handlers(['onLoad', 'preRender']);
   * ```
   * @name .handlers
   * @param {String} `methods` Method names
   * @param {Object} `options`
   * @return {Object} Returns the instance for chaining.
   * @api public
   */

  handlers(methods, options) {
    arrayify(methods).forEach(name => this.handler(name, options));
    return this;
  }

  /**
   * Register a handler to be called on all layers on the route.
   *
   * ```js
   * router.all(file => {
   *   file.data.title = 'Home';
   * });
   * ```
   * @name .all
   * @param {Function} `fn` Handler function
   * @return {Object} Route instance for chaining
   * @api public
   */

  all(file) {
    return this.handle(file);
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
   * @param {Object} `file` File object
   * @return {Function} Callback that exposes `err` and `file`
   * @api public
   */

  async handle(method, file) {
    if (typeof method === 'object' && method !== null) {
      for (const name of this.methods) await this.handle(name, method);
      return method;
    }

    if (!this.routes.has(method)) {
      throw new Error(`Router handler "${method}" does not exist`);
    }

    for (const route of this.routes.get(method)) await route.handle(file);
    return file;
  }

  mixin(app) {
    app.all = this.all.bind(this);
    for (const name of this.methods) {
      app[name] = this[name].bind(this);
    }
  }
}

function arrayify(val) {
  return val ? Array.isArray(val) ? val : [val] : [];
}

/**
 * Expose `Router`
 */

module.exports = Router;
