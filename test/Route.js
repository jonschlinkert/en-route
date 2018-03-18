'use strict';

const assert = require('assert');
const Router = require('..');
const Route = Router.Route;

describe('Route', function() {
  describe('.all', function() {
    it('should add handler', function(cb) {
      const file = { path: '/' };
      const route = new Route('/foo');

      route.all(function(file) {
        file.called = true;
      });

      route.handle(file)
        .then(file => {
          assert(file.called);
          cb();
        })
        .catch(cb);
    });

    it('should stack', function(cb) {
      const file = { count: 0, path: '/' };
      const route = new Route('/foo');

      route.all(function(file) {
        file.count++;
      });

      route.all(function(file) {
        file.count++;
      });

      route.handle(file)
        .then(file => {
          assert.equal(file.count, 2);
          cb();
        })
        .catch(cb);
    });
  });

  describe('errors', function() {
    it('should handle errors', function(cb) {
      const file = { path: '/' };
      const route = new Route();
      const msg = 'this is an error!';

      route.all(function(file) {
        throw new Error(msg);
      });

      route.handle(file)
        .then(function() {
          cb(new Error('expected an error'));
        })
        .catch(err => {
          assert.equal(err.message, msg);
          cb();
        });
    });

    it('should stop handling middleware wher an error is returned', function(cb) {
      const file = { path: '/' };
      const route = new Route();
      const msg = 'this is an error!';

      route.all(function(file) {
        return Promise.reject(new Error(msg));
      });

      route.all(function(file) {
        file.path = 'foo';
      });

      route.handle(file)
        .then(function() {
          cb(new Error('expected an error'));
        })
        .catch(err => {
          assert.equal(file.path, '/');
          assert.equal(err.message, msg);
          cb();
        });
    });

    it('should handle throw', function(cb) {
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

      route.handle(file)
        .then(function() {
          cb(new Error('expected an error'));
        })
        .catch(err => {
          assert.equal(file.path, '/');
          assert.equal(err.message, msg);
          cb();
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
