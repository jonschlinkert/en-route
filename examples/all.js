const path = require('path');
const Router = require('..');
const File = require('vinyl');
const router = new Router();

router.handler(['onLoad', 'preRender', 'postRender']);
const file = new File({ path: 'foo/bar/index.js' });
let n = 0;

router.on('preHandle', (method, file) => console.log(`Before ${method}:`, file));
router.on('postHandle', (method, file) => console.log(`After ${method}:`, file));

const middleware = fn => {
  return file => {
    console.log();
    console.log('before', ++n);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        console.log(`after ${n}:`, file);
        console.log()
        fn(file);
        resolve(file);
      }, 100);
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
    new Error('should not match');
  });

router
  .onLoad(/\.md$/, middleware(file => (file.extname = '.html')))
  .onLoad(/\.html$/, middleware(file => (file.stem = 'foo')))
  .onLoad(/\.html$/, middleware(file => (file.stem = 'bar')))
  .onLoad(/\.html$/, middleware(file => (file.stem = 'baz')))
  .handle(file)
    .then(file => router.handle('preRender', file))
    .then(file => console.log('Done:', file))
    .catch(err => {
      console.error(err);
      process.exit();
    });


// setTimeout(spinner(), 5000);
