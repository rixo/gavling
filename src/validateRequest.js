'use strict';

var Promise = require('bluebird');
var flattenHeaders = require('dredd/lib/flatten-headers');
var gavel = Promise.promisifyAll(require('gavel'));
var decorateResult = require('./gavling.util').decorateResult;

module.exports = function validateRequest(req, transaction) {
  var transactionRequest = transaction.request;

  var real = {
    method: req.method,
    uri: req.uri,
    headers: req.headers,
    body: req.body
  };

  var expected = {
    headers: flattenHeaders(transactionRequest.headers),
    body: transactionRequest.body
  };

  return gavel.isValidAsync(real, expected, 'request')
    .then(function(valid) {
      if (valid) {
        return {
          valid: true
        };
      } else {
        return gavel.validateAsync(real, expected, 'request')
          .tap(decorateResult);
      }
    })
  ;
};
