'use strict';

var Route = require('../lib/layer');
var expect = require('chai').expect;


describe('Route', function() {
  describe('with path', function() {
    var route = new Route('/welcome', [ function(){} ]);

    it('should have path property', function() {
      expect(route.path).to.equal('/welcome');
    });

    it('should have handle property', function() {
      expect(route.handle).to.be.instanceof(Array);
      expect(route.handle).to.have.length(1);
    });

    it('should have whole path', function() {
      expect(route.hasParams()).to.be.false;
    });

    it('should match correctly', function() {
      expect(route.match('/welcome')).to.be.true;
      expect(route.match('/not-welcome')).to.be.false;
    });
  });

  describe('with path', function() {
    var route = new Route('/welcome/:foo/bar', [ function(){} ]);

    it('should have path property', function() {
      expect(route.path).to.equal('/welcome/:foo/bar');
    });

    it('should have handle property', function() {
      expect(route.handle).to.be.instanceof(Array);
      expect(route.handle).to.have.length(1);
    });

    it('should have whole path', function() {
      expect(route.hasParams()).to.be.true;
    });

    it('should match correctly', function() {
      expect(route.match('/welcome/foo/bar')).to.be.true;
      expect(route.match('/not-welcome')).to.be.false;
    });
  });

  describe('with parameterized path', function() {
    var route = new Route('/blog/:year/:month/:day/:slug', [ function(){} ]);
    it('should have path property', function() {
      expect(route.path).to.equal('/blog/:year/:month/:day/:slug');
    });

    it('should have handle property', function() {
      expect(route.handle).to.be.instanceof(Array);
      expect(route.handle).to.have.length(1);
    });

    it('should not have whole path', function() {
      expect(route.hasParams()).to.be.true;
    });

    it('should match correctly', function() {
      expect(route.match('/blog/2014/08/01/assemble-v0.6.0')).to.be.true;
      expect(route.params).to.be.instanceof(Object);
      expect(Object.keys(route.params)).to.have.length(4);
      expect(route.params.year).to.equal('2014');
      expect(route.params.month).to.equal('08');
      expect(route.params.day).to.equal('01');
      expect(route.params.slug).to.equal('assemble-v0.6.0');

      expect(route.match('/blog/2014/08/01')).to.be.false;
      expect(route.match('/not-blog/2014/08/01/assemble-v0.6.0')).to.be.false;
    });
  });

  describe('with regexp', function () {
    var route = new Route(/\.md/, [ function () {} ]);

    it('should match correctly', function () {
      expect(route.match('/path/to/post.md')).to.be.true;
      expect(route.match('/path/to/template.hbs')).to.be.false;
    });
  });

  describe('with filter function', function () {
    var filter = function (obj) {
      return (!('draft' in obj) || obj.draft === false);
    };
    var route = new Route(filter, [ function () {} ]);

    it('should match correctly', function () {
      expect(route.match({})).to.be.true;
      expect(route.match({draft: false})).to.be.true;
      expect(route.match({draft: true})).to.be.false;
    });
  });
});
