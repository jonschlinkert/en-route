const File = require('./file');
const Router = require('..');
const router = new Router({ handlers: ['one', 'two'], parallel: true });
const file = new File({ path: '/abc', methods: [] });

function delay(name, delay) {
  return file => {
    return new Promise(resolve => {
      setTimeout(() => {
        console.log(name);
        file.methods.push(name);
        resolve();
      }, delay);
    });
  }
}

router.one('/abc', delay('foo', 1000));
router.two('/abc', delay('bar', 100));
router.one('/abc', delay('baz', 500));
router.two('/abc', delay('qux', 1));
router.one('/abc', delay('fez', 300));

router.all(file)
  .then(() => {
    console.log(file.methods); //=> ['qux', 'bar', 'fez', 'baz', 'foo']
  });
