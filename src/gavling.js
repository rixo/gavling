'use strict';

var Promise = require('bluebird');
var urlParser = require('drakov/lib/parse/url'); // this has no drakov deps
var util = require('./util');
var validateRequest = require('./validateRequest');
var validateResponse = require('./validateResponse');
var createMiddleware = require('./createMiddleware');
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

  this.middlewarePromise = function(options) {
    var transactionsPromise = ready().then(function() {
      return transactions;
    });
    return createMiddleware.promise(transactionsPromise, options);;
  };

  this.middleware = function(options) {
    var transactionsPromise = ready().then(function() {
      return transactions;
    });
    return createMiddleware.middleware(transactionsPromise, options);
  };
}

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
