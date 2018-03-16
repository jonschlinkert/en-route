'use strict';

const path = require('path');
const util = require('util');
const typeOf = require('kind-of');
const Route = require('./route');
const utils = require('./utils');

class Router {
  constructor(options) {
    this.options = Object.assign({}, options);
    this.routes = {};
  }

  /**
   * Create a middleware handler method.
   *
   * @param {String} `name` Method name
   * @param {Object} `options`
   * @return {Object} Returns the instance for chaining.
   * @api public
   */

  handler(name, options) {
    if (Array.isArray(name)) return this.handlers(name);
    if (!this.routes[name]) this.routes[name] = [];

    const opts = Object.assign({}, this.options, options);

    utils.define(this, name, (pattern, ...fns) => {
      if (fns.length === 0 && typeof pattern === 'function') {
        fns = [pattern];
        pattern = '/';
      }
      this.routes[name].push(new Route(pattern, fns, opts));
      return this;
    });
    return this;
  }

  /**
   * Create multiple middleware handler methods.
   *
   * @param {String} `names` Method names
   * @param {Object} `options`
   * @return {Object} Returns the instance for chaining.
   * @api public
   */

  handlers(names, options) {
    names.forEach(name => this.handler(name, options));
    return this;
  }

  /**
   * Run a middleware methods on the given `file`.
   *
   * ```js
   * route.handle(file, function(err, res) {
   *   console.log(err, res);
   * });
   * ```
   * @param {Object} `file` File object
   * @return {Function} Callback that exposes `err` and `file`
   * @api public
   */

  handle(method, file) {
    if (!this.options.once || !this.isHandled(method, file)) {
      return utils.each(this.routes[method], route => route.handle(file))
        .then(() => {
          file.routes = file.routes || {};
          file.routes.handled = file.routes.handled || new Set();
          file.routes.handled.add(method);
          return file;
        });
    }

    return Promise.resolve(file);
  }

  isHandled(method, file) {
    return file.routes && file.routes.handled && file.routes.handled.has(method);
  }
}

function arrayify(val) {
  return val ? (Array.isArray(val) ? val : [val]) : [];
}

/**
 * Expose `Router`
 */

module.exports = Router;
