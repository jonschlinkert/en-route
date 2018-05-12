console.time('Total runtime');
console.time('init');
const Router = require('..');
const router = new Router({ handlers: ['foo'] });
console.timeEnd('init');

const count = file => (file.count++);

router.handler('foo');
router
  .foo(/./, count)
  .foo(/./, count)
  .foo(/./, count)
  .foo(/./, count)
  .foo(/./, count)
  .foo(/./, count)
  .foo(/./, count)
  .foo(/./, count)
  .foo(/./, count)
  .foo(/./, count)

router.handle('foo', { path: 'templates/pages/index.hbs', count: 0 })
  .then(file => console.log('file.count:', file.count))
  .then(() => console.timeEnd('Total runtime'))
  .catch(console.error);
