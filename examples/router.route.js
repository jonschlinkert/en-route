const Router = require('..');
const router = new Router({ handlers: ['one', 'two'] });
const foo = { path: '/foo', content: 'abc' };
const bar = { path: '/bar', content: 'abc' };
const baz = { path: '/baz', content: 'abc' }
const qux = { path: '/qux', content: 'abc' }

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
  .then(file => console.log(file, foo.content, bar.content, baz.content, qux.content))
  .catch(console.error);
