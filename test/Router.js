
var enRoute = require('../')
  , after = require('after')
  , should = require('should')
  , Router = enRoute.Router
  , assert = require('assert');

describe('Router', function(){
  it('should return a function with router methods', function() {
    var router = Router();
    assert(typeof router == 'function');

    var router = new Router();
    assert(typeof router == 'function');

    assert(typeof router.handle == 'function');
    assert(typeof router.use == 'function');
  });

  it('should support .use of other routers', function(done) {
    var router = new Router();
    var another = new Router();

    another.all('/bar', function(file, next) {
      next();
    });
    router.use('/foo', another);

    router.handle({ path: '/foo/bar' }, done);
  });

  it('should support dynamic routes', function(done) {
    var router = new Router();
    var another = new Router();

    another.all('/:bar', function(file, next) {
      file.options.params.bar.should.equal('route');
      next();
    });
    router.use('/:foo', another);

    router.handle({ path: '/test/route' }, done);
  });

  xit('should handle blank path', function(done){
    var router = new Router();

    router.use(function (file, next) {
      false.should.be.true;
      next();
    });

    router.handle({ path: '' }, done);
  });

  describe('.handle', function(){
    it('should dispatch', function(done){
      var router = new Router();
      var file = { path: '/foo' };

      router.route('/foo').all(function(file, next){
        file.content = 'foo';
        next();
      });

      router.handle(file, function (err) {
        file.content.should.equal('foo');
        done();
      });
    })
  })

  describe('.multiple callbacks', function(){
    it('should throw if a callback is null', function(){
      assert.throws(function () {
        var router = new Router();
        router.route('/foo').all(null);
      })
    })

    it('should throw if a callback is undefined', function(){
      assert.throws(function () {
        var router = new Router();
        router.route('/foo').all(undefined);
      })
    })

    it('should throw if a callback is not a function', function(){
      assert.throws(function () {
        var router = new Router();
        router.route('/foo').all('not a function');
      })
    })

    it('should not throw if all callbacks are functions', function(){
      var router = new Router();
      router.route('/foo').all(function(file, next){next();}).all(function(file, next){next();});
    });
  });

  describe('error', function(){
    it('should skip non error middleware', function(done){
      var router = new Router();

      router.all('/foo', function(file, next){
        next(new Error('foo'));
      });

      router.all('/bar', function(file, next){
        next(new Error('bar'));
      });

      router.use(function(file, next){
        assert(false);
      });

      router.use(function(err, file, next){
        assert.equal(err.message, 'foo');
        done();
      });

      router.handle({ path: '/foo' }, done);
    });

    it('should handle throwing inside routes with params', function(done) {
      var router = new Router();

      router.all('/foo/:id', function(file, next){
        throw new Error('foo');
      });

      router.use(function(file, next){
        assert(false);
      });

      router.use(function(err, file, next){
        assert.equal(err.message, 'foo');
        done();
      });

      router.handle({ path: '/foo/2' }, function() {});
    });

    it('should handle throwing in handler after async param', function(done) {
      var router = new Router();

      router.param('user', function(file, next, val){
        process.nextTick(function(){
          file.user = val;
          next();
        });
      });

      router.use('/:user', function(file, next){
        throw new Error('oh no!');
      });

      router.use(function(err, file, next){
        assert.equal(err.message, 'oh no!');
        done();
      });

      router.handle({ path: '/bob' }, function() {});
    });

    it('should handle throwing inside error handlers', function(done) {
      var router = new Router();

      router.use(function(file, next){
        throw new Error('boom!');
      });

      router.use(function(err, file, next){
        throw new Error('oops');
      });

      router.use(function(err, file, next){
        assert.equal(err.message, 'oops');
        done();
      });

      router.handle({ path: '/' }, done);
    });
  })

  describe('.use', function() {
    it('should require arguments', function(){
      var router = new Router();
      router.use.bind(router).should.throw(/requires middleware function/)
    })

    it('should not accept non-functions', function(){
      var router = new Router();
      router.use.bind(router, '/', 'hello').should.throw(/requires middleware function.*string/)
      router.use.bind(router, '/', 5).should.throw(/requires middleware function.*number/)
      router.use.bind(router, '/', null).should.throw(/requires middleware function.*null/)
      router.use.bind(router, '/', new Date()).should.throw(/requires middleware function.*date/)
    })

    it('should accept array of middleware', function(done){
      var count = 0;
      var router = new Router();

      function fn1(file, next){
        assert.equal(++count, 1);
        next();
      }

      function fn2(file, next){
        assert.equal(++count, 2);
        next();
      }

      router.use([fn1, fn2], function(file){
        assert.equal(++count, 3);
        done();
      });

      router.handle({ path: '/foo' }, function(){});
    })
  })

  describe('.param', function() {
    it('should call param function when routing', function(done) {
      var router = new Router();

      router.param('id', function(file, next, id) {
        assert.equal(id, '123');
        next();
      });

      router.all('/foo/:id/bar', function(file, next) {
        assert.equal(file.options.params.id, '123');
        next();
      });

      router.handle({ path: '/foo/123/bar' }, done);
    });

    it('should call param function when routing middleware', function(done) {
      var router = new Router();

      router.param('id', function(file, next, id) {
        assert.equal(id, '123');
        next();
      });

      router.use('/foo/:id/bar', function(file, next) {
        assert.equal(file.options.params.id, '123');
        assert.equal(file.path, '/baz');
        next();
      });

      router.handle({ path: '/foo/123/bar/baz' }, done);
    });

    it('should only call once per request', function(done) {
      var count = 0;
      var file = { path: '/foo/bob/bar' };
      var router = new Router();
      var sub = new Router();

      sub.all('/bar', function(file, next) {
        next();
      });

      router.param('user', function(file, next, user) {
        count++;
        file.user = user;
        next();
      });

      router.use('/foo/:user/', new Router());
      router.use('/foo/:user/', sub);

      router.handle(file, function(err) {
        if (err) return done(err);
        assert.equal(count, 1);
        assert.equal(file.user, 'bob');
        done();
      });
    });

    it('should call when values differ', function(done) {
      var count = 0;
      var file = { path: '/foo/bob/bar' };
      var router = new Router();
      var sub = new Router();

      sub.all('/bar', function(file, next) {
        next();
      });

      router.param('user', function(file, next, user) {
        count++;
        file.user = user;
        next();
      });

      router.use('/foo/:user/', new Router());
      router.use('/:user/bob/', sub);

      router.handle(file, function(err) {
        if (err) return done(err);
        assert.equal(count, 2);
        assert.equal(file.user, 'foo');
        done();
      });
    });
  });

  describe('parallel requests', function() {
    it('should not mix requests', function(done) {
      var file1 = { path: '/foo/50/bar' };
      var file2 = { path: '/foo/10/bar' };
      var router = new Router();
      var sub = new Router();

      done = after(2, done);

      sub.all('/bar', function(file, next) {
        next();
      });

      router.param('ms', function(file, next, ms) {
        ms = parseInt(ms, 10);
        file.ms = ms;
        setTimeout(next, ms);
      });

      router.use('/foo/:ms/', new Router());
      router.use('/foo/:ms/', sub);

      router.handle(file1, function(err) {
        assert.ifError(err);
        assert.equal(file1.ms, 50);
        assert.equal(file1.options.originalPath, '/foo/50/bar');
        done();
      });

      router.handle(file2, function(err) {
        assert.ifError(err);
        assert.equal(file2.ms, 10);
        assert.equal(file2.options.originalPath, '/foo/10/bar');
        done();
      });
    });
  });
})
