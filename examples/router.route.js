const File = require('./file');
const Router = require('..');
const router = new Router({ handlers: ['one', 'two'] });
const foo = new File({ path: '/foo', content: 'abc' });
const bar = new File({ path: '/bar', content: 'abc' });
const baz = new File({ path: '/baz', content: 'abc' });
const qux = new File({ path: '/qux', content: 'abc' });

const route = router.route(/./)
  .one(function(file) {
    file.content += 'foo';
  })
  .two(function(file) {
    file.content += 'bar';
  });

route.handle(foo)
  .then(() => route.handle(bar))
  .then(() => route.handle(baz))
  .then(() => route.handle(qux))
  .then(file => console.log(file === qux, foo, bar, baz, qux))
  .catch(console.error);
