'use strict';

require('mocha');
const path = require('path');
const assert = require('assert');
const Layer = require('../lib/layer');

describe('Layer', function() {
  describe('layer properties', function() {
    it('should create a new Layer with the given string pattern', function() {
      const layer = new Layer('/foo', () => {});
      assert.equal(layer.pattern, '/foo');
    });

    it('should add a handler function to the layer', function() {
      const layer = new Layer('/foo', () => {});
      assert.equal(typeof layer.handler, 'function');
    });
  });

  describe('.match', function() {
    it('should match a path with the layer pattern', function() {
      const layer = new Layer('/foo', () => {});
      assert(layer.match('/foo'));
    });

    it('should support regex', function() {
      const layer = new Layer(/\/foo/, () => {});
      assert(layer.match('/foo'));
    });

    it('should cache regex patterns', function() {
      const layer = new Layer(/\/foo/, () => {});
      assert.equal(typeof layer.regexp, 'undefined');
      layer.match('/foo');
      layer.match('/foo');
      layer.match('/foo');
      layer.match('/foo');
      assert.equal(typeof layer.regexp, 'object');
    });

    it('should match params', function() {
      const layer = new Layer('/:name', () => {});
      assert.deepEqual(layer.match('/foo'), { name: 'foo' });
    });

    it('should return null when no path is given', function() {
      const layer = new Layer('/:name', () => {});
      assert.equal(layer.match(), null);
    });

    it('should number un-named params', function() {
      const layer = new Layer('(.*)/:parent/:folder/:basename', () => {});
      const fp = path.resolve(__dirname, 'foo/bar.hbs');
      const params = layer.match(fp);
      assert.equal(params[0], path.dirname(__dirname));
      assert.equal(params.parent, 'test');
      assert.equal(params.folder, 'foo');
    });
  });

  describe('params', function() {
    const layer = new Layer('/blog/:year/:month/:day/:slug', () => {});

    it('should have pattern property', function() {
      assert.equal(layer.pattern, '/blog/:year/:month/:day/:slug');
    });

    it('should match correctly', function() {
      const params = layer.match('/blog/2015/04/18/hello-world');
      assert(params);
      assert(params && typeof params === 'object');
      assert.equal(Object.keys(params).length, 4);
      assert.equal(params.year, '2015');
      assert.equal(params.month, '04');
      assert.equal(params.day, '18');
      assert.equal(params.slug, 'hello-world');
      assert(!layer.match('/blog/2015/04/18'));
      assert(!layer.match('/not-blog/2015/04/18/hello-world'));
    });
  });
});

