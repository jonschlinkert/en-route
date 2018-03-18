'use strict';

require('mocha');
const assert = require('assert');
const Layer = require('../lib/layer');

describe('Layer', function() {
  describe('with parameterized pattern', function() {
    const layer = new Layer('/blog/:year/:month/:day/:slug');

    it('should have pattern property', function() {
      assert.equal(layer.pattern, '/blog/:year/:month/:day/:slug');
    });

    it('should match correctly', function() {
      assert(layer.match('/blog/2015/04/18/hello-world'));
      assert(layer.params && typeof layer.params === 'object');
      assert.equal(Object.keys(layer.params).length, 4);
      assert.equal(layer.params.year, '2015');
      assert.equal(layer.params.month, '04');
      assert.equal(layer.params.day, '18');
      assert.equal(layer.params.slug, 'hello-world');
      assert(!layer.match('/blog/2015/04/18'));
      assert(!layer.match('/not-blog/2015/04/18/hello-world'));
    });
  });
});

