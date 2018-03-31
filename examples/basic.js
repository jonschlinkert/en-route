console.time('Runtime');
console.time('router');
const Router = require('..');
const router = new Router();
const file = { path: 'templates/pages/index.hbs', count: 0 }
console.timeEnd('router');

router.handlers(['onLoad']);
router.on('handle', console.log);
router.on('layer', console.log);

router
  .onLoad(/./, file => (file.count++))
  .onLoad(/./, file => (file.count++))
  .onLoad(/./, file => (file.count++))
  .onLoad(/./, file => (file.count++))
  .onLoad(/./, file => (file.count++))

router.handle('onLoad', file)
  .then(file => console.log('Count:', file.count))
  .then(() => console.timeEnd('Runtime'))
  .catch(console.error);
