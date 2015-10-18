'use strict';

var pathToRegexp = require('path-to-regexp');
var queryComparator = require('drakov/lib/query-comparator');
//var urlParser = require('drakov/lib/parse/url'); // this has no drakov deps

module.exports = function(request, transactions) {
  var result;
  transactions.some(function(transaction) {
    var urlPattern = transaction.parsedUrl.url;
    var regex = pathToRegexp(urlPattern);
    var match = regex.exec(request.path);
    if (match) {
      if (transaction.request.method === request.method) {
        result = transaction;
        return true;
      }
    }
  });
  return result;
};
