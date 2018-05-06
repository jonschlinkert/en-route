const Router = require('..');
const File = require('./file');
const file = new File({ path: 'templates/pages/index.hbs' });
const router = new Router({ handlers: ['foo', 'bar'] });

router.foo(/./, file => console.log('foo:', file));
router.bar(/./, file => console.log('bar:', file));

router.all(file)
  .then(file => console.log('Done:', file))
  .catch(console.error);
