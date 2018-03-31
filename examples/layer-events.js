const Router = require('..');
const router = new Router({ handlers: ['one', 'two'] });
const file = { path: '/foo', content: 'abc' };



const route = router.route('/foo')
  .one(function(file) {
    file.content += 'foo';
  })
  .two(function(file) {
    file.content += 'bar';
  });

route.on('layer', (method, file, route) => console.log('METHOD:', method, route));

route.handle(file)
  .then(() => console.log(file.content))
  .catch(console.error);
