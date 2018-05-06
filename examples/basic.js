console.time('Runtime');
console.time('init');
const Router = require('..');
const router = new Router();
console.timeEnd('init');

router.handlers(['onLoad']);

router
  .onLoad(/./, file => (file.count++))
  .onLoad(/./, file => (file.count++))
  .onLoad(/./, file => (file.count++))
  .onLoad(/./, file => (file.count++))
  .onLoad(/./, file => (file.count++))
  .onLoad(/./, file => (file.count++))
  .onLoad(/./, file => (file.count++))
  .onLoad(/./, file => (file.count++))
  .onLoad(/./, file => (file.count++))
  .onLoad(/./, file => (file.count++))

router.handle('onLoad', { path: 'templates/pages/index.hbs', count: 0 })
  .then(file => console.log('file.count:', file.count))
  .then(() => console.timeEnd('Total runtime'))
  .catch(console.error);
