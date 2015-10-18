describe('gavling.util', function() {
  var util = require('../src/util');
  var path = require('path');
  var testDir = path.join(__dirname, 'gavling-util-test-files');

  describe('expandGlobs', function() {
    it('accepts a single string', function(done) {
      util.expandGlobs(path.join(testDir, '**/*'))
        .then(function(files) {
          expect(files.length).toBe(5);
        }, this.fail)
        .finally(done)
        .done();
    });
    it('respects the glob pattern', function(done) {
      util.expandGlobs(path.join(testDir, '**/*.apib'))
        .then(function(files) {
          expect(files.length).toBe(2);
        }, this.fail)
        .finally(done)
        .done();
    });
    it('accepts an array of strings', function(done) {
      util.expandGlobs([
        path.join(testDir, '**/*.apib'),
        path.join(testDir, '**/*.js')
      ])
        .then(function(files) {
          expect(files.length).toBe(4);
        }, this.fail)
        .finally(done)
        .done();
    });
    it('rejects on glob failures', function(done) {
      util.expandGlobs(path.join(testDir, ' *broken glob*'))
        .then(function() {
          return 'resolved';
        }, function() {
          return 'rejected';
        })
        .then(function(result) {
          expect(result).toBe('rejected');
        })
        .finally(done)
        .done();
    });
  });

  describe('loadFiles', function() {
    it('returns an object with absolute filenames as keys', function(done) {
      var filename = path.join(testDir, 'b.apib');
      util.loadFiles([filename])
        .then(function(data) {
          expect(Object.keys(data).indexOf(filename)).toBe(0);
        }, this.fail)
        .finally(done)
        .done();
    });

    it('returns an object with filename and raw data as value', function(done) {
      var filename = path.join(testDir, 'b.apib');
      util.loadFiles([filename])
        .then(function(data) {
          expect(typeof data[filename]).toBe('object');
          expect(data[filename].filename).toBe(filename);
          expect(typeof data[filename].raw).toBe('string');
        }, this.fail)
        .finally(done);
    });

    it('reads data from local files', function(done) {
      var filename = path.join(testDir, 'b.apib');
      util.loadFiles([filename])
        .then(function(data) {
          expect(data[filename].raw).toBe('Blueprint ipsum apiem sit amet.\n');
        }, this.fail)
        .finally(done);
    });

    it('reads data from URIs', function(done) {
      var filename = 'http://example.com/';
      util.loadFiles([filename])
        .then(function(data) {
          expect(data[filename].raw.indexOf("<title>Example Domain</title>") !== -1).toBe(true);
        }, this.fail)
        .finally(done);
    });
  });

  describe('parseBlueprints', function() {
    it('returns a promise', function(done) {
      var filename = path.join(testDir, 'test.apib');
      util.loadFiles([filename])
        .then(function(results) {
          expect(typeof util.parseBlueprints(results).then).toBe('function');
        }, this.fail)
        .finally(done);
    });

    it('can be chained to util.loadFiles', function(done) {
      var filename = path.join(testDir, 'test.apib');
      util.loadFiles([filename])
        .then(util.parseBlueprints)
        .then(function() {
          return 'resolved';
        }, function() {
          return 'rejected';
        })
        .then(function(result) {
          expect(result).toBe('resolved');
        })
        .finally(done);
    });

    it('resolve with an object containing transactions, warnings, and errors', function(done) {
      var filename = path.join(testDir, 'test.apib');
      util.loadFiles([filename])
        .then(util.parseBlueprints)
        .then(function(result) {
          expect(typeof result).toBe('object');
          expect(Array.isArray(result.transactions)).toBe(true);
          expect(Array.isArray(result.warnings)).toBe(true);
          expect(Array.isArray(result.errors)).toBe(true);
        }, this.fail)
        .finally(done);
    });

    it('succeeds in parsing the blueprint', function(done) {
      var filename = path.join(testDir, 'test.apib');
      util.loadFiles([filename])
        .then(util.parseBlueprints)
        .then(function(result) {
          expect(result.transactions.length).toBe(1);
          expect(result.transactions[0].request.uri).toBe('/message');
        }, this.fail)
        .finally(done);
    });
  });
});
