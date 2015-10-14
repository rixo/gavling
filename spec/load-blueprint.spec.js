//var lib = require('../src/load-blueprint');
//
//describe('Blueprint loader', function() {
//  it('has a parse method', function () {
//    expect(typeof lib.parse).toBe('function');
//  });
//
//  it('does not error', function(done) {
//    lib.parse(__dirname + '/../apiary.apib', function(err, result) {
//      expect(err).toBe(null);
//      done();
//    });
//  });
//
//  it('returns a parse object', function(done) {
//    lib.parse(__dirname + '/../apiary.apib', function(err, result) {
//      //console.log(JSON.stringify(result.attributes, false, 2))
//      //console.log(result.content[0])
//      expect(typeof result).toBe('object');
//      done();
//    });
//  });
//});
