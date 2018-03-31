'use strict';

const assert = require('assert');
const Router = require('..');
const Route = Router.Route;

describe('Route', function() {
  describe('handlers', function() {
    it('should add handler', async function() {
      const file = { path: '/', count: 0 };
      const route = new Route('/', file => (file.count++));

      return await route.handle(file)
        .then(route.handle.bind(route))
        .then(route.handle.bind(route))
        .then(file => {
          assert.equal(file.count, 3);
        });
    });
  });

  describe('.all', function() {
    it('should add handler', function() {
      const file = { path: '/' };
      const route = new Route('/foo');

      route.all(function(file) {
        file.called = true;
      });

      return route.handle(file)
        .then(file => {
          assert(file.called);
        });
    });

    it('should stack', function() {
      const file = { count: 0, path: '/' };
      const route = new Route('/foo');

      route.all(function(file) {
        file.count++;
      });

      route.all(function(file) {
        file.count++;
      });

      return route.handle(file)
        .then(file => {
          assert.equal(file.count, 2);
        });
    });
  });

  describe('errors', function() {
    it('should handle errors', function() {
      const file = { path: '/' };
      const route = new Route();
      const msg = 'this is an error!';

      route.all(function(file) {
        throw new Error(msg);
      });

      return route.handle(file)
        .then(function() {
          throw new Error('expected an error');
        })
        .catch(err => {
          assert.equal(err.message, msg);
        });
    });

    it('should stop handling middleware wher an error is returned', function() {
      const file = { path: '/' };
      const route = new Route();
      const msg = 'this is an error!';

      route.all(function(file) {
        return Promise.reject(new Error(msg));
      });

      route.all(function(file) {
        file.path = 'foo';
      });

      return route.handle(file)
        .then(function() {
          throw new Error('expected an error');
        })
        .catch(err => {
          assert.equal(file.path, '/');
          assert.equal(err.message, msg);
        });
    });

    it('should handle throw', function() {
      const file = { path: '/' };
      const route = new Route();
      const msg = 'this is an error!';

      route.all(function(file) {
        throw new Error(msg);
      });

      route.all(function(file) {
        // should not call this function
        file.path = 'foo';
      });

      return route.handle(file)
        .then(function() {
          throw new Error('expected an error');
        })
        .catch(err => {
          assert.equal(file.path, '/');
          assert.equal(err.message, msg);
        });
    });
  });

  describe('with parameterized path', function() {
    const route = new Route('/blog/:year/:month/:day/:slug').all([() => {}, () => {}]);

    it('should have pattern property', function() {
      assert.equal(route.pattern, '/blog/:year/:month/:day/:slug');
    });

    it('should have stack property', function() {
      assert(Array.isArray(route.stack));
      assert.equal(route.stack.length, 2);
    });
  });
});
