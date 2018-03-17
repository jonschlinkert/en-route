const path = require('path');
const Router = require('.');
const File = require('vinyl');
const router = new Router();

router.handler(['onLoad', 'onRender']);
const file = new File({ path: 'foo/bar/index.js' });

router.on('handle', (method, file) => {
  console.log(`Before ${method}:`, file);
});
router.on('after', (method, file) => {
  console.log(`After ${method}:`, file);
});

router.onLoad('(.*)/:name.js', (file, params) => {
  console.log('Params:', params);
  file.extname = '.md';
});

router.onRender(/./, (file, params) => {
  console.log('onRender:', file);
});

router.onLoad(/not-a-match/, file => {
  new Error('should not match');
});

router.onLoad(/\.md$/, file => {
  console.log();
  console.log('before 2');
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log('after 2:', file);
      console.log()
      file.extname = '.html';
      resolve(file);
    }, 2000);
  });
});

router.onLoad(/.*\.html$/, file => {
  console.log();
  console.log('before 3');
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log('after 3:', file);
      console.log()
      file.stem = 'foo';
      resolve(file);
    }, 2000);
  });
}, file => {
  console.log();
  console.log('before 4');
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log('after 4:', file);
      console.log()
      file.stem = 'bar';
      resolve(file);
    }, 2000);
  });
}, file => {
  console.log();
  console.log('before 5');
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log('after 5:', file);
      console.log()
      file.stem = 'baz';
      resolve(file);
    }, 2000);
  });
});

router.handle('onLoad', file)
  .then(file => router.handle('onRender', file))
  .then(file => console.log('Done:', file))
  .catch(err => {
    console.error(err);
    process.exit();
  });


// setTimeout(spinner(), 5000);
