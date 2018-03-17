const Router = require('..');
const File = require('vinyl');
const file = new File({ path: 'foo/bar/index.js' });
const router = new Router();

router.handler(['onLoad', 'preRender', 'postRender']);
router.on('preHandle', (method, file) => console.log(`Before ${method}:`, file));
router.on('postHandle', (method, file) => console.log(`After ${method}:`, file));

let n = 0;
const wait = (fn, timeout = 500) => {
  return file => {
    console.log();
    console.log('before', ++n);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        console.log(`after ${n}:`, file);
        console.log();
        fn(file);
        resolve(file);
      }, timeout);
    });
  };
};

router
  .onLoad('(.*)/:name.js', (file, params) => {
    console.log('Params:', params);
    file.extname = '.md';
  })
  .preRender(/./, console.log.bind(console, 'preRender:'))
  .onLoad(/not-a-match/, file => {
    throw new Error('should not match');
  });

router
  .onLoad(/\.md$/, wait(file => (file.extname = '.html')))
  .onLoad(/\.html$/, wait(file => (file.stem = 'foo')))
  .onLoad(/\.html$/, wait(file => (file.stem = 'bar')))
  .onLoad(/\.html$/, wait(file => (file.stem = 'baz')))

router.handle(file)
  .then(file => router.handle('preRender', file))
  .then(file => console.log('Done:', file))
  .catch(err => {
    console.error(err);
    process.exit();
  });
