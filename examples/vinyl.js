const Router = require('..');
const File = require('vinyl');
const file = new File({ path: 'templates/pages/index.hbs' });
const router = new Router();

router.handler(['onLoad', 'preRender', 'postRender']);
router.on('handle', (method, view, route) => {
  console.log(`${route.status} ${method}:`, view);
});

router
  .onLoad(/\.hbs$/, file => (file.extname = '.html'))
  .onLoad(/\.html$/, file => (file.stem = 'foo'))
  .preRender(/\.html$/, file => (file.stem = 'bar'))
  .postRender(/\.html$/, file => (file.stem = 'baz'));

router.handle(file)
  .then(file => console.log('Done:', file))
  .catch(console.error);
