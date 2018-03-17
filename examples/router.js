const path = require('path');
const Router = require('..');
const File = require('vinyl');
const router = new Router();

router.handler(['onLoad', 'preRender', 'postRender']);
const file = new File({ path: 'templates/pages/index.hbs' });
let n = 0;

router.on('preHandle', (method, file) => console.log(`Before ${method}:`, file));
router.on('postHandle', (method, file) => console.log(`After ${method}:`, file));

router
  .onLoad(/\.hbs$/, file => (file.extname = '.html'))
  .onLoad(/\.html$/, file => (file.stem = 'foo'))
  .onLoad(/\.html$/, file => (file.stem = 'bar'))
  .onLoad(/\.html$/, file => (file.stem = 'baz'))
  .handle(file)
    .then(file => router.handle('preRender', file))
    .then(file => console.log('Done:', file))
    .catch(err => {
      console.error(err);
      process.exit();
    });


// setTimeout(spinner(), 5000);
