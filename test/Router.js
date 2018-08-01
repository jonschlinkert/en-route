'use strict';

const assert = require('assert');
const Router = require('..');

describe('handlers', function() {
  describe('constructor options', function() {
    it('should return a Router with the handlers defined on the options', function() {
      const router = new Router({ handlers: ['before', 'after'] });
      assert.equal(typeof router.all, 'function');
      assert.equal(typeof router.before, 'function');
      assert.equal(typeof router.after, 'function');
    });

    it('should return a Router with specific original handlers then allow adding additional handlers', function() {
      const router = new Router({ handlers: ['before', 'after'] });
      assert.equal(typeof router.all, 'function');
      assert.equal(typeof router.before, 'function');
      assert.equal(typeof router.after, 'function');
      assert.equal(typeof router.additional, 'undefined');

      router.handler('additional');
      assert.equal(typeof router.additional, 'function');
    });

    it('should support dynamic routes on handlers', function() {
      const router = new Router({ handlers: ['before'] });
      const another = new Router({ handlers: ['before'] });

      another.before('/:bar', function(file) {
        assert(file.routes.params.bar, 'route');
      });

      return router.handle({path: '/test/route', routes: { method: 'before' }});
    });
  });

  describe('.mixin', function() {
    it('should mix handler methods onto the given object', function() {
      const router = new Router();
      const obj = {};
      router.handlers(['before', 'after']);
      router.mixin(obj);
      assert.equal(typeof obj.all, 'function');
      assert.equal(typeof obj.before, 'function');
      assert.equal(typeof obj.after, 'function');
    });
  });

  describe('.handlers', function() {
    it('should register an array of handlers', function() {
      const router = new Router();
      router.handlers(['before', 'after']);
      assert.equal(typeof router.all, 'function');
      assert.equal(typeof router.before, 'function');
      assert.equal(typeof router.after, 'function');
    });

    it('should register an single handler', function() {
      const router = new Router();
      router.handlers('before');
      assert.equal(typeof router.all, 'function');
      assert.equal(typeof router.before, 'function');
    });
  });

  describe('.handler', function() {
    it('should register an array of handlers', function() {
      const router = new Router();
      router.handler(['before', 'after']);
      assert.equal(typeof router.all, 'function');
      assert.equal(typeof router.before, 'function');
      assert.equal(typeof router.after, 'function');
    });

    it('should register an single handler', function() {
      const router = new Router();
      router.handler('before');
      assert.equal(typeof router.all, 'function');
      assert.equal(typeof router.before, 'function');
    });

    it('should throw an error when value is not an array or string', function() {
      const router = new Router();
      assert.throws(() => router.handler(), /expected/);
    });
  });

  describe('.handle', function() {
    it('should throw an error when method does not exist', function() {
      const router = new Router();
      return router.handle('flsflskjsk')
        .catch(err => {
          assert(/exist/.test(err.message));
        });
    });

    it('should throw an error when method does not exist', function() {
      const router = new Router({ handlers: ['foo', 'bar', 'baz' ]});

      return router.handle('flsflskjsk')
        .catch(err => {
          assert(/exist/.test(err.message));
        });
    });
  });

  describe('.route', function() {
    it('should dispatch to handlers', function() {
      const router = new Router({ handlers: ['before', 'after'] });
      const file = { path: '/foo', content: '' };

      const foo = router.route('/foo')
        .before(function(file) {
          file.content += 'foo';
        })
        .after(function(file) {
          file.content += 'bar';
        });

      return foo.handle(file)
        .then(() => {
          assert.equal(file.content, 'foobar');
        });
    });

    it('should not dispatch to handlers that do not match', function() {
      const router = new Router({ handlers: ['before'] });
      const file = { path: '/bar' };

      const route = router.route('/foo')
        .before(function(file) {
          file.content = 'foo';
        });

      return route.handle(file)
        .then(() => {
          assert.equal(file.content, undefined);
        });
    });

    it('should register a layer for each pattern specified on the route', function() {
      const router = new Router({ handlers: ['before'] });
      const file = { path: '/bar' };

      const route = router.route(['/foo', '/bar'])
        .before(function(file) {
          file.content = 'bar';
        });

      return route.handle(file)
        .then(() => {
          assert.equal(file.content, 'bar');
        });
    });

    it('should dispatch to dynamic handlers', function() {
      const router = new Router({ handlers: ['before'] });
      const file = { path: '/foo' };

      router.handler('additional');

      const foo = router.route('/foo')
        .additional(function(file) {
          file.content = 'foo';
        });

      return foo.handle(file)
        .then(() => {
          assert(file.content, 'foo');
        });
    });
  });

  describe('.all', function() {
    it('should run all handlers on the given file', function() {
      const router = new Router({ handlers: ['foo', 'bar', 'baz'] });
      const file = { path: '/abc', methods: [] };

      router.foo('/abc', file => {
        file.methods.push('foo');
      });
      router.bar('/abc', file => {
        file.methods.push('bar');
      });
      router.baz('/abc', file => {
        file.methods.push('baz');
      });

      return router.all(file)
        .then(() => {
          assert.deepEqual(file.methods, ['foo', 'bar', 'baz']);
        });
    });

    it('should run all handlers in series', function() {
      const router = new Router({ handlers: ['foo', 'bar', 'baz'] });
      const file = { path: '/abc', methods: [] };

      function timeout(name, delay) {
        return file => {
          return new Promise(resolve => {
            setTimeout(() => {
              file.methods.push(name);
              resolve();
            }, delay);
          });
        }
      }

      router.foo('/abc', timeout('foo', 10));
      router.bar('/abc', timeout('bar', 5));
      router.baz('/abc', timeout('baz', 1));

      return router.all(file)
        .then(() => {
          assert.deepEqual(file.methods, ['foo', 'bar', 'baz']);
        });
    });

    it('should run all handlers on the given file when options.parallel is true', function() {
      const router = new Router({ handlers: ['foo', 'bar', 'baz'], parallel: true });
      const file = { path: '/abc', methods: [] };

      router.foo('/abc', file => {
        file.methods.push('foo');
      });
      router.bar('/abc', file => {
        file.methods.push('bar');
      });
      router.baz('/abc', file => {
        file.methods.push('baz');
      });

      return router.all(file)
        .then(() => {
          assert.deepEqual(file.methods, ['foo', 'bar', 'baz']);
        });
    });

    it('should run all handlers in parallel', function() {
      const router = new Router({ handlers: ['foo', 'bar', 'baz'], parallel: true });
      const file = { path: '/abc', methods: [] };

      function timeout(name, delay) {
        return file => {
          return new Promise(resolve => {
            setTimeout(() => {
              file.methods.push(name);
              resolve();
            }, delay);
          });
        }
      }

      router.foo('/abc', timeout('foo', 10));
      router.bar('/abc', timeout('bar', 5));
      router.baz('/abc', timeout('baz', 1));

      return router.all(file)
        .then(() => {
          assert.deepEqual(file.methods, ['baz', 'bar', 'foo']);
        });
    });
  });

  describe('.all', function() {
    it('should run all handlers on the given file synchronously', function() {
      const router = new Router({ handlers: ['foo', 'bar', 'baz'], sync: true });
      const file = { path: '/abc', methods: [] };

      router.foo('/abc', file => {
        file.methods.push('foo');
      });
      router.bar('/abc', file => {
        file.methods.push('bar');
      });
      router.baz('/abc', file => {
        file.methods.push('baz');
      });

      router.all(file);
      assert.deepEqual(file.methods, ['foo', 'bar', 'baz']);
    });
  });

  describe('.multiple callbacks', function() {
    it('should throw if a callback is null on a method', function() {
      assert.throws(function() {
        const router = new Router({handlers: ['before'] });
        router.route('/foo').before(null);
      }, /expected "before" handlers to be functions/);
    });

    it('should throw if a callback is undefined on a method', function() {
      assert.throws(function() {
        const router = new Router({handlers: ['before'] });
        router.route('/foo').before(undefined);
      }, /expected "before" handlers to be functions/);
    });

    it('should throw if a callback is not a function on a method', function() {
      assert.throws(function() {
        const router = new Router({ handlers: ['before'] });
        router.route('/foo').before('not a function');
      }, /expected "before" handlers to be functions/);
    });

    it('should not throw if all callbacks are functions on a method', function() {
      const router = new Router({ handlers: ['before'] });
      return router.route('/foo')
        .before(() => {});
    });
  });

  describe('error', function() {
    it('should skip non error middleware on a method', function() {
      const router = new Router({ handlers: ['before'] });

      router.before('/foo', function(file) {
        throw new Error('foo');
      });

      router.before('/bar', function(file) {
        throw new Error('bar');
      });

      return router.handle({ path: '/foo' })
        .catch(function(err) {
          assert.equal(err.message, 'foo');
        });
    });

    it('should handle throwing inside routes with params on a method', function() {
      const router = new Router({ handlers: ['before'] });

      router.before('/foo/:id', function(file) {
        throw new Error('foo');
      });

      return router.handle({ path: '/foo/2' })
        .catch(err => {
          assert.equal(err.message, 'foo');
        });
    });
  });

  describe('params', function() {
    it('should expose params as second argument on middleware', function() {
      const called = [];
      const file = { path: '/foo/123/bar', routes: { method: 'before' } };
      const router = new Router({ handlers: ['before'] });

      router.before('/foo/:id/bar', function(file, params) {
        assert.equal(params.id, '123');
        called.push('before');
      });

      return router.handle(file)
        .then(function() {
          assert.equal(called[0], 'before');
        });
    });
  });
});
