const Router = require('..');
const File = require('vinyl');
const file = new File({ path: 'templates/pages/index.hbs' });
const router = new Router({ handlers: ['onLoad', 'preRender', 'postRender'] });

router.onLoad(/./, file => console.log('onLoad:', file));
router.preRender(/./, file => console.log('preRender:', file));

router.all(file)
  .then(file => console.log('Done:', file))
  .catch(console.error);
