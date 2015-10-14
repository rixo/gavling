'use strict';

var Gavling = require('../src/gavling');
var path = require('path');
var httpMocks = require('node-mocks-http');

describe('Gavling', function() {
  var gavling;

  beforeEach(function() {
    gavling = new Gavling({
      path: path.join(__dirname, '/gavling.spec-example.apib')
    });
  });

  describe('exposes a promise method', function() {
    it('that exists', function() {
      expect(gavling.promise).toBeDefined();
    });

    it('that is a function', function() {
      expect(typeof gavling.promise).toBe('function');
    });

    it('that returns a promise', function() {
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/user/42',
        params: {
          id: 42
        }
      });
      var res = httpMocks.createResponse();
      expect(typeof gavling.promise(req, res).then).toBe('function');
    });
  });

  describe('promise', function() {
    var req, res;

    beforeEach(function() {
      req = httpMocks.createRequest({
        method: 'GET',
        url: '/items',
        params: {
          id: 42
        }
      });
      res = httpMocks.createResponse();
    });

    it('matches transaction by URL', function() {

    });
  });
});
