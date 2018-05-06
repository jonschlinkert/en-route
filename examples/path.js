const File = require('./file');
const Router = require('..');
const router = new Router({ handlers: ['onLoad'] });
// const file = new File({ path: '/path/to/files/posts/post-1/index.hbs', methods: [] });
const file = new File({ path: '/path/to/files/posts/create.hbs', methods: [] });

router.onLoad(':base(.*?)/posts/:post/:index*', (view, params) => {
  console.log(params);
  //=> { base: '/path/to/files', post: 'post-1', index: 'index.hbs' }
  //=> { base: '/path/to/files', post: 'create.hbs', index: undefined }
});

router.handle('onLoad', file)
  .then(console.log)
  .catch(console.error);
