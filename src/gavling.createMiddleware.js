'use strict';

var matchRequest = require('./matchRequest');
var validateRequest = require('./validateRequest');

module.exports = function createMiddleware(transactions, options) {
  options = _.extend({
    request: true,
    response: true
  }, options);

  return function(req, res, next) {

    if (options.request || options.response) {
      var transaction = matchRequest(req, transactions);
    }

    if (options.request) {
      validateRequest(req, transaction)
        .then(function(result) {
          if (!result.valid) {
            // TODO
          }
        }, function(err) {

        })
        .done();
    }

    if (options.response) {
      var send = res.send;
      res.send = function() {
        // TODO
        return send.apply(this, arguments);
      };
      //var buffer = [];
      //res.on('data', function(data) {
      //  buffer.push(data);
      //});
      //res.on('error', function(error) {
      //  // TODO
      //});
      //res.once('end', function() {
      //  buffer = buffer.join('');
      //  me.validateResponse(req, res)
      //});
    }

    next();
  };
};
