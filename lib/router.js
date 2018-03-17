'use strict';

const assert = require('assert');
const debug = require('debug')('en-route:router');
const Emitter = require('@sellside/emitter');
const Route = require('./route');

/**
 * Create a new Router with the given options.
 * @name Router
 * @extends {Class} Emitter
 * @param {String} `method` Method name
 * @param {Object} `options`
 * @return {Object} Returns the instance for chaining.
 * @api public
 */

class Router extends Emitter {
  constructor(options) {
    debug('initializing from <%s>', __filename);
    super();
    this.options = Object.assign({}, options);
    this.methods = new Set();
    this.routes = new Map();
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
    if (Array.isArray(method)) return this.handlers(method);
    if (!this.routes.has(method)) this.routes.set(method, new Set());

    assert.equal(typeof method, 'string', 'expected method name to be a string');
    const opts = Object.assign({}, this.options, options);
    const stack = this.routes.get(method);

    const handler = (pattern, ...fns) => {
      if (fns.length === 0 && typeof pattern === 'function') {
        fns = [pattern];
        pattern = '/';
      }

      const route = new Route(pattern, fns, opts);
      route.on('after', file => this.emit('after', method, file));
      route.on('handle', file => {
        this.emit('handle', method, file);
        this.emit(method, file);
      });

      stack.add(route);
      return this;
    };

    this.emit('handler', method, handler);
    define(this, method, handler);
    this.methods.add(method);
    return this;
  }

  /**
   * Create multiple middleware handler methods.
   * @name .handlers
   * @param {String} `methods` Method names
   * @param {Object} `options`
   * @return {Object} Returns the instance for chaining.
   * @api public
   */

  handlers(methods, options) {
    methods.forEach(name => this.handler(name, options));
    return this;
  }

  /**
   * Run a middleware methods on the given `file`.
   *
   * ```js
   * // run a specific method
   * route.handle('onLoad', file)
   *   .then(file => console.log('File:', file))
   *   .catch(console.error);
   *
   * // run multiple methods
   * route.handle('onLoad', file)
   *   .then(file => router.handle('preRender', file))
   *   .catch(console.error);
   *
   * // run all methods
   * route.handle(file)
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

    const stack = this.routes.get(method);

    if (stack.size > 0) {
      this.emit('preHandle', method, file);
      for (const route of stack) {
        await route.handle(file);
      }
      this.emit('postHandle', method, file);
    }
    return file;
  }

  isBuiltin(key) {
    return key in this && !this.methods.has(key);
  }
}

function define(ctx, key, val) {
  Reflect.defineProperty(ctx, key, {
    writable: true,
    configurable: true,
    enumerable: false,
    value: val
  });
}

/**
 * Expose `Router`
 */

module.exports = Router;
