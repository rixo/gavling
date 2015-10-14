'use strict';

var Q = require('q');
var util = require('./gavling.util');

module.exports = Gavling;

function Gavling(options) {
  var me = this;
  this.options = options;
  this.transactionsPromise = loadBlueprintTransactions(options.path)
    .then(function(transactions) {
      me.transactions = transactions;
      delete me.transactionsPromise;
    })
    .done();
}

Gavling.prototype.promise = function(req, res) {
  var me = this;
  return resolveTransactions()
    .then(function(transactions) {
      console.log(transactions);
    });

  function resolveTransactions() {
    if (me.transactionsPromise) {
      return me.transactionsPromise;
    } else {
      return Q.when(me.transactions);
    }
  }
};

function loadBlueprintTransactions(path) {
  return util.expandGlobs(path)
    .then(util.loadFiles)
    .then(util.parseBlueprints)
}
