const { Suite } = require('benchmark');
const argv = require('minimist')(process.argv.slice(2));
const cursor = require('ansi')(process.stdout);
const Routes = require('..');
const Route = require('../lib/route');

const cycle = (e, nl) => {
  cursor.eraseLine();
  cursor.horizontalAbsolute();
  cursor.write('  ' + e.target);
  if (nl) cursor.write('\n');
};

function bench(name) {
  if (!argv[name]) {
    const res = {};
    res.add = () => res;
    res.run = () => res;
    return res;
  }

  console.log(`\n# ${name}`);
  const suite = new Suite();
  const res = {
    run: suite.run.bind(suite),
    add: (key, fn) => {
      suite.add(key, {
        onCycle: e => cycle(e),
        onComplete: e => cycle(e, true),
        fn: fn
      });
      return res;
    }
  };
  return res;
}

/**
 * Routes - instantiation
 */

bench('routes')
  .add('no options', () => {
    new Routes();
  })
  .add('with options.handlers = 0', () => {
    new Routes({ handlers: [] });
  })
  .add('with options.handlers = 1', () => {
    new Routes({ handlers: ['foo'] });
  })
  .add('with options.handlers = 2', () => {
    new Routes({ handlers: ['foo', 'bar'] });
  })
  .add('with options.handlers = 3', () => {
    new Routes({ handlers: ['foo', 'bar', 'baz'] });
  })
  .add('with options.handlers = 4', () => {
    new Routes({ handlers: ['foo', 'bar', 'baz', 'qux'] });
  })
  .add('with options.handlers = 5', () => {
    new Routes({ handlers: ['foo', 'bar', 'baz', 'qux', 'fez'] });
  })
  .add('with options.handlers = 10', () => {
    new Routes({ handlers: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'] });
  })
  .run();


bench('handle')
  .add('route handlers: 1', async() => {
    try {
      const noop = file => {};
      const route = new Route('/foo', [noop]);
      await route.handle({ path: '/foo' });
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  })
  .add('route handlers: 2', async() => {
    try {
      const noop = file => {};
      const route = new Route('/foo', [noop, noop]);
      await route.handle({ path: '/foo' });
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  })
  .add('route handlers: 3', async() => {
    try {
      const noop = file => {};
      const route = new Route('/foo', [noop, noop, noop]);
      await route.handle({ path: '/foo' });
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  })
  .run({ async: true });




