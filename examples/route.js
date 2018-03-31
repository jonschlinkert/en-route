const handle = file => file.count++;
const Route = require('../lib/route');
const route = new Route('/(.*)', [handle, handle, handle]);
const file = { path: '/foo', count: 0 };

route.handle(file)
  .then(file => {
    console.log(file.count); // 3
  });
