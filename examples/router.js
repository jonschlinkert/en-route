const Router = require('..');
const File = require('./file');
const file = new File({ path: 'templates/pages/index.hbs' });
const router = new Router();

router.handler(['onLoad', 'preRender', 'postRender']);
router.on('handle', (method, file, route) => {
  console.log(method, route.status, file);
});

router
  .onLoad(/\.hbs$/, file => (file.extname = '.html'))
  .onLoad(/\.html$/, file => (file.stem = 'foo'))
  .onLoad(/\.html$/, file => (file.stem = 'bar'))
  .onLoad(/\.html$/, file => (file.stem = 'baz'));

router.preRender(/./, file => {
  file.dirname = 'abc/xyz';
});

router.handle(file)
  .then(router.handle.bind(router, 'preRender'))
  .then(router.handle.bind(router, 'postRender'))
  .then(() => console.log('done'))
  .catch(console.error);
