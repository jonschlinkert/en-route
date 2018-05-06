const Router = require('..');
const File = require('./file');
const file = new File({ path: 'templates/pages/index.hbs' });
const router = new Router();

router.handler(['foo', 'bar', 'baz', 'qux', 'fez']);
router.on('handle', (method, file) => console.log(method, file));

router
  .foo(/\.hbs$/, file => (file.extname = '.html'))
  .foo(/\.html$/, file => (file.stem = 'foo'))
  .bar(/\.html$/, file => (file.stem = 'bar'))
  .baz(/\.html$/, file => (file.stem = 'baz'))
  .qux(/./, () => {}) //<= shouldn't run this
  .fez(/./, () => {}); //<= shouldn't run this

router.handle('foo', file)
  .then(file => router.handle('bar', file))
  .then(file => router.handle('baz', file))
  .then(file => console.log('Done:', file))
  .catch(console.error);
