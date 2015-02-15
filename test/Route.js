'use strict';

var assert = require('assert');
var should = require('should');
var enRoute = require('..');
var Route = enRoute.Route;

describe('Route', function () {
  describe('.all', function () {
    it('should add handler', function (done) {
      var file = {path: '/'};
      var route = new Route('/foo');

      route.all(function (file, next) {
        file.called = true;
        next();
      });

      route.dispatch(file, function (err) {
        if (err) return done(err);
        should(file.called).be.ok;
        done();
      });
    });

    it('should stack', function (done) {
      var file = {count: 0, path: '/'};
      var route = new Route('/foo');

      route.all(function (file, next) {
        file.count++;
        next();
      });

      route.all(function (file, next) {
        file.count++;
        next();
      });

      route.dispatch(file, function (err) {
        if (err) return done(err);
        file.count.should.equal(2);
        done();
      });
    });
  });

  describe('errors', function () {
    it('should handle errors via arity 3 functions', function (done) {
      var file = {order: '', path: '/'};
      var route = new Route('');

      route.all(function (file, next) {
        next(new Error('foobar'));
      });

      route.all(function (file, next) {
        file.order += '0';
        next();
      });

      route.all(function (err, file, next) {
        file.order += 'a';
        next(err);
      });

      route.dispatch(file, function (err) {
        should(err).be.ok;
        should(err.message).equal('foobar');
        file.order.should.equal('a');
        done();
      });
    });

    it('should handle throw', function (done) {
      var file = {order: '', path: '/'};
      var route = new Route('');

      route.all(function (file, next) {
        throw new Error('foobar');
      });

      route.all(function (file, next) {
        file.order += '0';
        next();
      });

      route.all(function (err, file, next) {
        file.order += 'a';
        next(err);
      });

      route.dispatch(file, function (err) {
        should(err).be.ok;
        should(err.message).equal('foobar');
        file.order.should.equal('a');
        done();
      });
    });

    it('should handle throwing inside error handlers', function (done) {
      var file = {path: '/'};
      var route = new Route('');

      route.all(function (file, next) {
        throw new Error('boom!');
      });

      route.all(function (err, file, next) {
        throw new Error('oops');
      });

      route.all(function (err, file, next) {
        file.message = err.message;
        next();
      });

      route.dispatch(file, function (err) {
        if (err) return done(err);
        should(file.message).equal('oops');
        done();
      });
    });

    it('should handle throw in .all', function (done) {
      var file = {path: '/'};
      var route = new Route('');

      route.all(function (file, next) {
        throw new Error('boom!');
      });

      route.dispatch(file, function (err) {
        should(err).be.ok;
        err.message.should.equal('boom!');
        done();
      });
    });

    it('should handle single error handler', function (done) {
      var file = {method: 'GET', path: '/'};
      var route = new Route('');

      route.all(function (err, file, next) {
        // this should not execute
        true.should.be.false;
      });

      route.dispatch(file, done);
    });
  });
});

describe('with parameterized path', function () {
  var route = new Route('/blog/:year/:month/:day/:slug').all([
    function () {}
  ]);

  it('should have path property', function () {
    route.path.should.equal('/blog/:year/:month/:day/:slug');
  });

  it('should have stack property', function () {
    route.stack.should.be.instanceof(Array);
    route.stack.should.have.length(1);
  });

  // it('should match correctly', function () {
  //   route.match('/blog/2015/04/18/hello-world').should.be.true;
  //   route.params.should.be.instanceof(Object);
  //   Object.keys(route.params).should.have.length(4);
  //   route.params.year.should.equal('2015');
  //   route.params.month.should.equal('04');
  //   route.params.day.should.equal('18');
  //   route.params.slug.should.equal('hello-world');

  //   route.match('/blog/2015/04/18').should.be.false;
  //   route.match('/not-blog/2015/04/18/hello-world').should.be.false;
  // });
});