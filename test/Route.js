'use strict';

const assert = require('assert');
const Router = require('..');
const Route = Router.Route;

describe('Route', function() {
  describe('handlers', function() {
    it('should add a handler', async function() {
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

  describe('.handle', function() {
    it('should handle a file', function() {
      const fn = file => file.count++;
      const route = new Route('/(.*)', [fn, fn, fn]);
      const file = { path: '/foo', count: 0 };

      return route.handle(file)
        .then(() => {
          assert.equal(file.count, 3);
        });
    });

    it('should return the file in the promise', function() {
      const fn = file => file.count++;
      const route = new Route('/(.*)', [fn, fn, fn]);

      return route.handle({ path: '/foo', count: 0 })
        .then(file => {
          assert.equal(file.count, 3);
        });
    });

    it('should run in series', function() {
      const fn = (name, delay) => {
        return file => {
          return new Promise(resolve => {
            setTimeout(function() {
              file.names.push(name);
              resolve();
            }, delay);
          });
        };
      };

      const fns = [fn('a', 10), fn('b', 5), fn('c', 1)];
      const route = new Route('/(.*)', fns);

      return route.handle({ path: '/foo', names: [] })
        .then(file => {
          assert.deepEqual(file.names, ['a', 'b', 'c']);
        });
    });

    it('should run in parallel', function() {
      const fn = (name, delay) => {
        return file => {
          return new Promise(resolve => {
            setTimeout(function() {
              file.names.push(name);
              resolve();
            }, delay);
          });
        };
      };

      const fns = [fn('a', 10), fn('b', 5), fn('c', 1)];
      const route = new Route('/(.*)', fns, { parallel: true });

      return route.handle({ path: '/foo', names: [] })
        .then(file => {
          assert.deepEqual(file.names, ['c', 'b', 'a']);
        });
    });

    it('should run in synchronously', function() {
      const fn = name => file => file.names.push(name);
      const fns = [fn('a'), fn('b'), fn('c')];
      const route = new Route('/(.*)', fns, { sync: true });
      const file = { path: '/foo', names: [] };
      route.handle(file);
      assert.deepEqual(file.names, ['a', 'b', 'c']);
    });
  });

  describe('.all', function() {
    it('should add a handler', function() {
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

    it('should add a function to the stack each time all is called', function() {
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

    it('should take an array of functions', function() {
      const file = { count: 0, path: '/' };
      const route = new Route('/foo');

      route.all([
        function(file) {
          file.count++;
        },
        function(file) {
          file.count++;
        }
      ]);

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
