var protagonist = require('protagonist');
var fs = require('fs');

module.exports = {
  parse: parse
};

function parse(filename, callback) {
  fs.readFile(filename, 'utf8', function(err, data) {
    if (err) {
      callback(err);
    } else {
      protagonist.parse(data, {
        exportSourcemap: true
      }, function(err, data) {
        callback(err, data);
      });
    }
  });
}
