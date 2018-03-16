const path = require('path');
const Router = require('.');
const File = require('vinyl');
const mm = require('micromatch');
const router = new Router({
  toRegex: str => mm.makeRe(str, { end: true, capture: true })
});

router.handler(['onLoad', 'onRender']);

const file = new File({ path: path.resolve(process.cwd(), 'index.js') });

router.onLoad('**/index.*', file => {
  console.log('File 1:', file);
  // throw new Error('should be caught');
  file.extname = '.md';
});

router.onLoad(/not-a-match/, file => {
  new Error('should not match');
});

router.onLoad(/\.md$/, file => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log('File 2:', file);
      file.extname = '.html';
      resolve(file);
    }, 2000);
  });
});

router.onLoad(/.*\.html$/, async file => {
  return await new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log('File 3:', file);
      file.stem = 'foo';
      resolve(file);
    }, 500);
  });
}, async file => {
  return await new Promise((resolve, reject) => {
    console.log('before 4')
    setTimeout(() => {
      console.log('File 4:', file);
      file.stem = 'bar';
      resolve(file);
    }, 500);
  });
}, file => {
  return new Promise((resolve, reject) => {
    console.log('before 5')
    setTimeout(() => {
      console.log('File 5:', file);
      file.stem = 'baz';
      resolve(file);
    }, 500);
  });
});

router.handle('onLoad', file)
  .then(file => router.handle('onRender', file))
  .then(file => console.log('Done:', file))
  .catch(err => {
    console.error(err);
    process.exit();
  })
