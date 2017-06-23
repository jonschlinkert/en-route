'use strict';

var assert = require('assert');
var enRoute = require('..');
var Route = enRoute.Route;

describe('Route', function() {
  describe('.all', function() {
    it('should add handler', function(cb) {
      var file = {path: '/'};
      var route = new Route('/foo');

      route.all(function(file, next) {
        file.called = true;
        next();
      });

      route.dispatch(file, function(err) {
        if (err) return cb(err);
        assert(file.called);
        cb();
      });
    });

    it('should stack', function(cb) {
      var file = {count: 0, path: '/'};
      var route = new Route('/foo');

      route.all(function(file, next) {
        file.count++;
        next();
      });

      route.all(function(file, next) {
        file.count++;
        next();
      });

      route.dispatch(file, function(err) {
        if (err) return cb(err);
        assert.equal(file.count, 2);
        cb();
      });
    });
  });

  describe('errors', function() {
    it('should handle errors via arity 3 functions', function(cb) {
      var file = {path: '/'};
      var route = new Route('');

      route.all(function(file, next) {
        next(new Error('foobar'));
      });

      route.all(function(file, next) {
        next();
      });

      route.all(function(err, file, next) {
        next(err);
      });

      route.dispatch(file, function(err) {
        assert(err);
        assert.equal(err.message, 'foobar');
        cb();
      });
    });

    it('should handle throw', function(cb) {
      var file = {path: '/'};
      var route = new Route('');

      route.all(function(file, next) {
        throw new Error('foobar');
      });

      route.all(function(file, next) {
        next();
      });

      route.dispatch(file, function(err) {
        assert(err);
        assert.equal(err.message, 'foobar');
        cb();
      });
    });

    it('should handle throw in .all', function(cb) {
      var file = {path: '/'};
      var route = new Route('');

      route.all(function(file, next) {
        throw new Error('boom!');
      });

      route.dispatch(file, function(err) {
        assert(err);
        assert.equal(err.message, 'boom!');
        cb();
      });
    });

    it('should handle single error handler', function(cb) {
      var file = {method: 'GET', path: '/'};
      var route = new Route('');

      route.all(function(err, file, next) {
        // this should not execute
        cb(new Error('expected route.all to not execute'));
      });

      route.dispatch(file, cb);
    });
  });
});

describe('with parameterized path', function() {
  var route = new Route('/blog/:year/:month/:day/:slug').all([
    function() {}
  ]);

  it('should have path property', function() {
    assert.equal(route.path, '/blog/:year/:month/:day/:slug');
  });

  it('should have stack property', function() {
    assert(Array.isArray(route.stack));
    assert.equal(route.stack.length, 1);
  });

  // it('should match correctly', function() {
  //   assert(route.match('/blog/2015/04/18/hello-world'));
  //   assert(route.params && typeof route.params === 'object');
  //   assert.equal(Object.keys(route.params).length, 4);
  //   assert.equal(route.params.year, '2015');
  //   assert.equal(route.params.month, '04');
  //   assert.equal(route.params.day, '18');
  //   assert.equal(route.params.slug, 'hello-world');

  //   assert(!route.match('/blog/2015/04/18'));
  //   assert(!route.match('/not-blog/2015/04/18/hello-world'));
  // });
});
