const File = require('./file');
const Route = require('../lib/route');

const handle = file => file.count++;
const route = new Route('/(.*)', [handle, handle, handle]);
const file = new File({ path: '/foo', count: 0 });

route.handle(file)
  .then(file => console.log('Count:', file.count))
  .catch(console.error);
