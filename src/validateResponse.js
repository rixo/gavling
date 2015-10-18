'use strict';

var flattenHeaders = require('dredd/lib/flatten-headers');
var gavel = require('gavel');
var decorateResult = require('./util').decorateResult;

module.exports = function validateResponse(res, body, transaction) {
  var transactionResponse = transaction.response;

  var real = {
    statusCode: res.statusCode,
    headers: res._headers,
    body: body
  };

  var expected = {
    headers: flattenHeaders(transactionResponse['headers']),
    body: transactionResponse['body'],
    statusCode: transactionResponse['status']
  };

  return gavel.isValidAsync(real, expected, 'response')
    .then(function(valid) {
      if (valid) {
        return {
          valid: true
        };
      } else {
        return gavel.validateAsync(real, expected, 'response')
          .tap(decorateResult.bind(this, 'response'));
      }
    })
  ;
};
