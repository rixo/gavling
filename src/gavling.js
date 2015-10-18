'use strict';

var Promise = require('bluebird');
var urlParser = require('drakov/lib/parse/url'); // this has no drakov deps
var util = require('./util');
var validateRequest = require('./validateRequest');
var validateResponse = require('./validateResponse');
var createMiddleware = require('./gavling.createMiddleware');
var matchRequest = require('./matchRequest');

module.exports = Gavling;

function Gavling(options) {
  if (!(this instanceof Gavling)) {
    return new Gavling(options);
  }

  var me = this,
    transactions;

  function ready() {
    if (transactionsPromise) {
      return transactionsPromise.return(me);
    } else {
      return Promise.resolve(me);
    }
  }

  var transactionsPromise = loadBlueprintTransactions(options.path)
    .then(function(runtimes) {
      // TODO process warnings & error
      if (runtimes.errors.length || runtimes.warnings.length) {
        console.log('runtimes.errors', runtimes.errors)
        console.log('runtimes.warnings', runtimes.warnings)
        throw new Error('TODO');
      }
      return runtimes.transactions;
    })
    .tap(function(_transactions) {
      transactions = _transactions;
    })
    .tap(postProcessTransactions);

  this.matchRequest = function(req) {
    return ready().then(function() {
      return matchRequest(req, transactions);
    });
  };

  this.validateRequest = function(req, transaction) {
    return ready().then(function() {
      if (!transaction) {
        transaction = matchRequest(req, transactions);
      }
      return validateRequest(req, transaction);
    });
  };

  this.validateResponse = function(req, body, transaction) {
    return ready().then(function() {
      return validateResponse(req, body, transaction);
    });
  };

  //this.middleware = function(options) {
  //  return function(req, res, next) {
  //    if (middleware) {
  //      middleware(req, res, next);
  //    } else {
  //      me.ready().then(function() {
  //        middleware = createMiddleware(me.runtime.transactions, options);
  //        middleware(req, res, next);
  //      }).done();
  //    }
  //  }
  //};
}

//function validateRequest(req) {
//  var me = this;
//
//  return me.ready()
//    //.then(resolveHandlers)
//    //.then(sortHandlers)
//    .then(handle);
//
//  function handle() {}
//
//  function resolveHandlers(runtimes) {
//    var handlers;
//    Object.keys(routeMap).some(function(urlPattern) {
//      var regex = pathToRegexp(urlPattern);
//
//      // req.path allows us to delegate query string handling to the route handler functions
//      var match = regex.exec(req.path);
//      if (match) {
//        handlers = routeMap[urlPattern].methods[req.method.toUpperCase()];
//        return !!handlers;
//      }
//    });
//    if (handlers) {
//      return handlers;
//    } else {
//      throw new Error('No match');
//    }
//  }
//
//  function sortHandlers(handlers) {
//    var queryParams = Object.keys(req.query);
//    if (queryParams.length === 0){
//      handlers.sort(queryComparator.noParamComparator);
//    } else {
//      queryComparator.countMatchingQueryParms(handlers, queryParams);
//      handlers.sort(queryComparator.queryParameterComparator);
//    }
//    return handlers;
//  }
//}

//Gavling.prototype.middleware = function(req, res, next) {
//  this.promise(req, res)
//    .then(function() {next();})
//    .catch(res.json)
//    .done();
//};

function loadBlueprintTransactions(path) {
  return util.expandGlobs(path)
    .then(util.loadFiles)
    .then(util.parseBlueprints)
}

function postProcessTransactions(transactions) {
  transactions.forEach(function(transaction) {
    transaction.parsedUrl = urlParser.parse(transaction.request.uri);
  });
}
