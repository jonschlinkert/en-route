
var should = require('should');
var enRoute = require('../')
  , Route = enRoute.Route
  , assert = require('assert');

describe('Route', function(){

  describe('.all', function(){
    it('should add handler', function(done){
      var file = { path: '/' };
      var route = new Route('/foo');

      route.all(function(file, next) {
        file.called = true;
        next();
      });

      route.dispatch(file, function (err) {
        if (err) return done(err);
        should(file.called).be.ok;
        done();
      });
    })

    it('should stack', function(done) {
      var file = { count: 0, path: '/' };
      var route = new Route('/foo');

      route.all(function(file, next) {
        file.count++;
        next();
      });

      route.all(function(file, next) {
        file.count++;
        next();
      });

      route.dispatch(file, function (err) {
        if (err) return done(err);
        file.count.should.equal(2);
        done();
      });
    })
  })

  describe('errors', function(){
    it('should handle errors via arity 3 functions', function(done){
      var file = { order: '', path: '/' };
      var route = new Route('');

      route.all(function(file, next){
        next(new Error('foobar'));
      });

      route.all(function(file, next){
        file.order += '0';
        next();
      });

      route.all(function(err, file, next){
        file.order += 'a';
        next(err);
      });

      route.dispatch(file, function (err) {
        should(err).be.ok;
        should(err.message).equal('foobar');
        file.order.should.equal('a');
        done();
      });
    })

    it('should handle throw', function(done) {
      var file = { order: '', path: '/' };
      var route = new Route('');

      route.all(function(file, next){
        throw new Error('foobar');
      });

      route.all(function(file, next){
        file.order += '0';
        next();
      });

      route.all(function(err, file, next){
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

    it('should handle throwing inside error handlers', function(done) {
      var file = { path: '/' };
      var route = new Route('');

      route.all(function(file, next){
        throw new Error('boom!');
      });

      route.all(function(err, file, next){
        throw new Error('oops');
      });

      route.all(function(err, file, next){
        file.message = err.message;
        next();
      });

      route.dispatch(file, function (err) {
        if (err) return done(err);
        should(file.message).equal('oops');
        done();
      });
    });

    it('should handle throw in .all', function(done) {
      var file = { path: '/' };
      var route = new Route('');

      route.all(function(file, next){
        throw new Error('boom!');
      });

      route.dispatch(file, function(err){
        should(err).be.ok;
        err.message.should.equal('boom!');
        done();
      });
    });

    it('should handle single error handler', function(done) {
      var file = { method: 'GET', path: '/' };
      var route = new Route('');

      route.all(function(err, file, next){
        // this should not execute
        true.should.be.false;
      });

      route.dispatch(file, done);
    });
  })
})
