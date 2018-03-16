'use strict';

const assert = require('assert');
const Router = require('..');
const Route = Router.Route;

describe('Route', function() {
  describe('.all', function() {
    it('should add handler', function(cb) {
      const file = { path: '/' };
      const route = new Route('/foo');

      route.all(function(file, next) {
        file.called = true;
        next();
      });

      route.handle(file, function(err) {
        if (err) return cb(err);
        assert(file.called);
        cb();
      });
    });

    it('should work as a promise', function(cb) {
      const file = { path: '/' };
      const route = new Route('/foo');

      route.all(function(file, next) {
        file.called = true;
        next();
      });

      route.handle(file).then(() => {
        assert(file.called);
        cb();
      });
    });

    it('should stack', function(cb) {
      const file = { count: 0, path: '/' };
      const route = new Route('/foo');

      route.all(function(file, next) {
        file.count++;
        next();
      });

      route.all(function(file, next) {
        file.count++;
        next();
      });

      route.handle(file, function(err) {
        if (err) return cb(err);
        assert.equal(file.count, 2);
        cb();
      });
    });
  });

  describe('errors', function() {
    it('should handle errors via arity 3 functions', function(cb) {
      const file = { path: '/' };
      const route = new Route('');

      route.all(function(file, next) {
        next(new Error('foobar'));
      });

      route.all(function(file, next) {
        next();
      });

      route.handle(file, function(err) {
        assert(err);
        assert.equal(err.message, 'foobar');
        cb();
      });
    });

    it('should handle throw', function(cb) {
      const file = { path: '/' };
      const route = new Route('');

      route.all(function(file, next) {
        throw new Error('foobar');
      });

      route.all(function(file, next) {
        next();
      });

      route.handle(file, function(err) {
        assert(err);
        assert.equal(err.message, 'foobar');
        cb();
      });
    });

    it('should handle throw in .all', function(cb) {
      const file = { path: '/' };
      const route = new Route('');

      route.all(function(file, next) {
        throw new Error('boom!');
      });

      route.handle(file, function(err) {
        assert(err);
        assert.equal(err.message, 'boom!');
        cb();
      });
    });
  });

  describe('with parameterized path', function() {
    const route = new Route('/blog/:year/:month/:day/:slug').all([function() {}]);

    it('should have path property', function() {
      assert.equal(route.path, '/blog/:year/:month/:day/:slug');
    });

    it('should have stack property', function() {
      assert(Array.isArray(route.stack));
      assert.equal(route.stack.length, 1);
    });
  });
});
