'use strict';

var Gavling = require('../src/gavling');
var path = require('path');
var httpMocks = require('node-mocks-http');

describe('Gavling', function() {
  var gavling;

  beforeEach(function() {
    gavling = Gavling({
      path: path.join(__dirname, '/gavling.spec-example.apib')
    });
  });

  describe('matchRequest', function() {
    it('matches request by URL', function(done) {
      var req = httpMocks.createRequest({
        url: '/items'
      });
      gavling.matchRequest(req)
        .then(function(transaction) {
          expect(transaction).toBeDefined();
        })
        .done(done);
    });

    it('matches request by URL and method', function(done) {
      var req = httpMocks.createRequest({
        method: 'POST',
        url: '/items2'
      });
      gavling.matchRequest(req)
        .then(function(transaction) {
          expect(transaction).toBeDefined();
        })
        .done(done);
    });
  });

  describe('validateRequest', function() {
    //describe('is a promise method', function() {
    //  it('that exists', function() {
    //    expect(gavling.validateRequest).toBeDefined();
    //  });
    //
    //  it('that is a function', function() {
    //    expect(typeof gavling.validateRequest).toBe('function');
    //  });
    //
    //  it('that returns a promise', function() {
    //    var req = httpMocks.createRequest({
    //      method: 'GET',
    //      url: '/items',
    //      params: {
    //        id: 42
    //      }
    //    });
    //    expect(typeof gavling.validateRequest(req).then).toBe('function');
    //  });
    //});
    it('resolves with result.valid true if request conforms to blueprint (GET)', function(done) {
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/items'
      });
      gavling.validateRequest(req)
        .then(function(result) {
          expect(result.valid).toBe(true);
        })
        .done(done);
    });

    it('resolves with result.valid true if request conforms to blueprint (POST)', function(done) {
      var req = httpMocks.createRequest({
        method: 'POST',
        url: '/items2',
        headers: {'Content-Type': 'application/json'},
        body: '{"test": false}'
      });
      gavling.matchRequest(req)
        .then(function(transaction) {
          return gavling.validateRequest(req, transaction);
        })
        .then(function(result) {
          expect(result.valid).toBe(true);
        })
        .done(done);
    });

    it('resolve with result.valid false if request does not conform to blueprint', function(done) {
      var req = httpMocks.createRequest({
        method: 'POST',
        url: '/items2',
        // missing content type header
        //headers: {'Content-Type': 'application/json'},
        body: '{"test": false}'
      });
      gavling.validateRequest(req)
        .then(function(result) {
          expect(result.valid).toBe(false);
        })
        .done(done);
    });
  });

  describe('validateResponse', function() {
    it('resolves with result.valid true if response conforms to blueprint', function(done) {
      var req = httpMocks.createRequest({
        method: 'POST',
        url: '/items2'
      });
      var res = httpMocks.createResponse()
        .set('Content-Type', 'application/vnd.siren+json')
        .status(200);
      var body = '{"version": 2}';
      gavling.matchRequest(req)
        .then(function(transaction) {
          expect(transaction).toBeDefined();
          if (!transaction) {
            throw new Error('Failed to resolve route (unexpected)');
          }
          return gavling.validateResponse(res, body, transaction);
        })
        .then(function(result) {
          expect(result.valid).toBe(true);
          if (!result.valid) {
            //console.log(result.message)
          }
        })
        .done(done);
    });

    it('resolves with result.valid false if response header is missing', function(done) {
      var req = httpMocks.createRequest({
        method: 'POST',
        url: '/items2'
      });
      var res = httpMocks.createResponse()
        .set('Content-Type', 'application/json')
        .status(200);
      var body = JSON.stringify({version: 2});
      gavling.matchRequest(req)
        .then(function(transaction) {
          expect(transaction).toBeDefined();
          if (!transaction) {
            throw new Error('Failed to resolve route (unexpected)');
          }
          return gavling.validateResponse(res, body, transaction);
        })
        .then(function(result) {
          expect(result.valid).toBe(false);
          expect(result.message).toBe(
            "[request.headers] Header 'content-type' has value 'application/json' " +
            "instead of 'application/vnd.siren+json'"
          );
        })
        .done(done);
    });

    it('resolves with result.valid false if body key is missing', function(done) {
      var req = httpMocks.createRequest({
        method: 'POST',
        url: '/items2'
      });
      var res = httpMocks.createResponse()
        .set('Content-Type', 'application/vnd.siren+json')
        .status(200);
      var body = JSON.stringify({version_bad: 2});
      gavling.matchRequest(req)
        .then(function(transaction) {
          expect(transaction).toBeDefined();
          if (!transaction) {
            throw new Error('Failed to resolve route (unexpected)');
          }
          return gavling.validateResponse(res, body, transaction);
        })
        .then(function(result) {
          expect(result.valid).toBe(false);
          if (result.valid === false) {
            expect(result.message).toBe(
              "[request.body] At '/version' Missing required property: version"
            );
          }
        })
        .done(done);
    });

    it('resolves with result.valid false if status code is different', function(done) {
      var req = httpMocks.createRequest({
        method: 'POST',
        url: '/items2'
      });
      var res = httpMocks.createResponse()
        .set('Content-Type', 'application/vnd.siren+json')
        .status(500);
      var body = JSON.stringify({version: 2});
      gavling.matchRequest(req)
        .then(function(transaction) {
          expect(transaction).toBeDefined();
          if (!transaction) {
            throw new Error('Failed to resolve route (unexpected)');
          }
          return gavling.validateResponse(res, body, transaction);
        })
        .then(function(result) {
          expect(result.valid).toBe(false);
          if (!result.valid) {
            expect(result.message).toBe("[request.statusCode] Status code is not '200'");
          }
        })
        .done(done);
    });
  });

  describe('Client request validation', function() {
    describe('matches incoming requests against a request in the blueprint', function() {

    });
    describe('validates incoming requests against API blueprint', function() {

    });
    describe('Option: hook on the current test to report failure', function() {

    });
  });

  describe('Server response validation', function() {
    describe('against mock server', function() {

    });
    //describe('against real server', function() {
    //  describe('- record client requests (ideally during client automatised tests)', function() {
    //    /**
    //     * - group logs by 'scenario' (needs to hook in the current test runner)
    //     *     - client side karma+jasmine
    //     *     - server side protractor
    //     *     - server side jasmine-node
    //     */
    //  });
    //  describe('- playback ', function() {
    //
    //  });
    //});
  });
});
