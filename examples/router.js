const Router = require('..');
const File = require('vinyl');
const file = new File({ path: 'templates/pages/index.hbs' });
const router = new Router();

router.handler(['onLoad', 'preRender', 'postRender']);
router.on('preHandle', (method, file) => console.log(`Before ${method}:`, file));
router.on('postHandle', (method, file) => console.log(`After ${method}:`, file));

router
  .onLoad(/\.hbs$/, file => (file.extname = '.html'))
  .onLoad(/\.html$/, file => (file.stem = 'foo'))
  .onLoad(/\.html$/, file => (file.stem = 'bar'))
  .onLoad(/\.html$/, file => (file.stem = 'baz'));

router.handle(file)
  .then(file => router.handle('preRender', file))
  .then(file => console.log('Done:', file))
  .catch(console.error);
