'use strict';

var Promise = require('bluebird');
var _ = require('lodash');
var matchRequest = require('./matchRequest');
var validateRequest = require('./validateRequest');
var validateResponse = require('./validateResponse');
var logger = console;

module.exports = {
  promise: createMiddlewarePromise,
  middleware: createMiddleware
};

function createMiddleware(transactionsOrPromise, options) {
  return function(req, res, next) {
    var handler = createMiddlewarePromise(transactionsOrPromise, options);
    handler(req, res);
    next();
  }
}

function createMiddlewarePromise(transactionsOrPromise, options) {
  options = _.extend({
    request: true,
    response: true
  }, options);

  return function(req, res) {
    var responseBodyPromise = captureResponse(res);

    return Promise.resolve(transactionsOrPromise)
      .then(doMatchRequest)
      .then(doValidations);

    function doMatchRequest(transactions) {
      if (options.request || options.response) {
        var transaction = matchRequest(req, transactions);
        if (transaction) {
          return transaction;
        } else {
          throw new Error("Request does not match any spec", req);
        }
      } else {
        return null;
      }
    }

    function doValidations(transaction) {
      var resultPromise;
      if (options.response) {
        if (options.request) {
          resultPromise = responseBodyPromise
            .then(function(responseBody) {
              return Promise.join(
                doValidateRequest(transaction),
                doValidateResponse(transaction, responseBody)
              );
            });
        } else {
          resultPromise = responseBodyPromise.then(doValidateResponse.bind(this, transaction));
        }
      } else if (options.request) {
        resultPromise = doValidateRequest(transaction);
      } else {
        throw new Error('Unreachable');
      }
      return resultPromise;
    }

    function doValidateRequest(transaction) {
      return validateRequest(req, transaction)
        .then(function(result) {
          if (!result.valid) {
            result.errors.forEach(error);
            result.warnings.forEach(warning);
          }
          return result;
        }, function(err) {
          error("Cannot validate request", err);
        });
    }

    function doValidateResponse(transaction, body) {
      return validateResponse(res, body, transaction)
        .then(function(result) {
          if (!result.valid) {
            result.errors.forEach(error);
            result.warnings.forEach(warning);
          }
          return result;
        }, function(err) {
          error("Cannot validate response", err);
        });
    }
  };

  function error(err) {
    if (options.onError) {
      options.onError(err);
    } else if (options.onReport) {
      options.onReport('error', err);
    } else {
      logger.error("Validation error:", err);
    }
  }

  function warning(warn) {
    if (options.onWarning) {
      options.onWarning(warn);
    } else if (options.onReport) {
      options.onReport('warning', warn);
    } else {
      logger.warning("Validation warning:", warn);
    }
  }
}

function captureResponse(res) {
  return new Promise(function(resolve, reject) {
    var buffer = [];
    res.on('data', function(data) {
      buffer.push(data);
    });
    res.on('error', function(error) {
      reject(new Error("Could not capture response, with error:", error));
    });
    // TODO confirm this is the event
    res.once('end', function() {
      resolve(buffer.join(''));
    });
  });
}
