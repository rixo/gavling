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
    // we need to keep a copy as early as possible, to avoid bodyParser etc.
    // to change the body type
    var copy = {
      path: req.path,
      method: req.method,
      uri: req.uri,
      headers: req.headers,
      body: req.body
    };
    handler(copy, res)
        .catch(function(err) {
          if (!/^Request does not match any spec: /.test(String(err))) {
            throw err;
          }
        })
        .done();
    next();
  }
}

function createMiddlewarePromise(transactionsOrPromise, options) {
  options = _.extend({
    request: true,
    response: true,
    ignoreOptions: true
  }, options);

  return function(req, res) {
    if (options.ignoreOptions && req.method.toUpperCase() === 'OPTIONS') {
      return Promise.resolve([{
        skipped: true
      },{
        skipped: true
      }]);
    }

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
          error("Request does not match any spec: " + nameRequest());
          return Promise.reject("Request does not match any spec");
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
          if (result.valid) {
            success.bind(this, "Request for");
          } else {
            result.errors.forEach(function(err, i) {
              error(["Request for", nameRequest(),
                "is invalid" + (i > 0 ? '('+(i+1)+')' : '') + ":"
                , err
              ].join(' '));
            });
            // TODO warnings
            //result.warnings.forEach(warning.bind(this, "Request for"));
          }
          return result;
        //}, function(err) {
        //  error("Cannot validate request", err);
        });
    }

    function doValidateResponse(transaction, body) {
      return validateResponse(res, body, transaction)
        .then(function(result) {
          if (result.valid) {
            success.bind(this, "Request for");
          } else {
            result.errors.forEach(function(err, i) {
              error(["Response for", nameRequest(),
                "is invalid" + (i > 0 ? '('+(i+1)+')' : '') + ":"
                , err
              ].join(' '));
            });
            // TODO warnings
            //result.warnings.forEach(warning.bind(this, "Response for"));
          }
          return result;
        //}, function(err) {
        //  error("Cannot validate response", err);
        });
    }

    function nameRequest() {
      return req.method + ' ' + req.path;
    }

    function error(message) {
      //var message = [prefix, req.method, req.path, "is not valid:", message].join(' ');
      if (options.onError) {
        options.onError(message);
      } else if (options.onReport) {
        options.onReport('error', message);
      } else {
        logger.error(message);
      }
    }

    function warning(prefix, err) {
      var message = [prefix, req.method, req.path, "is not valid:", err].join(' ');
      if (options.onWarning) {
        options.onWarning(message);
      } else if (options.onReport) {
        options.onReport('warning', message);
      } else {
        logger.warning(message);
      }
    }

    function success(prefix) {
      var message = [prefix, req.method, req.path, "is valid"].join(' ');
      if (options.onSuccess) {
        options.onSuccess(message);
      } else if (options.onReport) {
        options.onReport('info', message);
      } else {
        logger.success(message);
      }
    }
  };
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
    // (this was not the right one apparently)
    //res.once('end', function() {
    //  resolve(buffer.join(''));
    //});
    res.once('finish', function() {
      resolve(buffer.join(''));
    });
  });
}
