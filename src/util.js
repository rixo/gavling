'use strict';

var Q = require('q');
var Promise = require('bluebird');
var blueprintTransactions = require('blueprint-transactions');
var glob = require('glob');
var request = require('request');
var fs = require('fs');
var url = require('url');
var Drafter = require('drafter');
var blueprintUtils = require('dredd/lib/blueprint-utils');
var handleRuntimeProblems = require('dredd/lib/handle-runtime-problems');
var urlParser = require('drakov/lib/parse/url');
var specSchema = require('drakov/lib/spec-schema');
var content = require('drakov/lib/content');
var logger = console;
var _ = require('lodash');

module.exports = {
  expandGlobs: expandGlobs,
  loadFiles: loadFiles,
  parseBlueprints: parseBlueprints,

  decorateResult: decorateResult
};

function expandGlobs(path, configDataIsPresent) {

  if (!Array.isArray(path)) {
    path = [path];
  }

  return Promise.all(path.map(promiseGlob))
    .then(function(newFiles) {
      return newFiles.reduce(function(list, files) {
        return list.concat(files);
      }, []);
    })
    .then(function(files) {
      if (!configDataIsPresent && files.length === 0) {
        throw new Error({
          message: "Blueprint file or files not found on path: '" + path + "'"
        });
      }
      return removeDuplicates(files);
    })
  ;

  function promiseGlob(globToExpand) {
    return new Promise(function(resolve, reject) {
      if (/^http(s)?:\/\//.test(globToExpand)) {
        resolve(globToExpand);
      } else {
        glob(globToExpand, function(err, match) {
          if (err) {
            reject(err);
          } else {
            resolve(match);
          }
        });
      }
    });
  }

  function removeDuplicates(arr) {
    return arr.reduce(function(alreadyProcessed, currentItem) {
      if (alreadyProcessed.indexOf(currentItem) === -1) {
        return alreadyProcessed.concat(currentItem);
      }
      return alreadyProcessed;
    }, []);
  }
}

function loadFiles(files, limit) {

  if (limit) {
    files = files.slice(0, limit);
  }

  return Promise.all(files.map(promiseReadFile))
    .then(function(data) {
      var result = {};
      data.forEach(function(datum) {
        result[datum.filename] = datum;
      });
      return result;
    })
}

function promiseReadFile(fileUrlOrPath) {
  var fileUrl, ref1;
  try {
    fileUrl = url.parse(fileUrlOrPath);
  } catch (_error) {
    fileUrl = null;
  }
  if (fileUrl && ((ref1 = fileUrl.protocol) === 'http:' || ref1 === 'https:') && fileUrl.host) {
    return downloadFile(fileUrlOrPath);
  } else {
    return readLocalFile(fileUrlOrPath);
  }
}

function downloadFile(fileUrl) {
  return Q.ninvoke(request, 'get', {
    url: fileUrl,
    timeout: 5000,
    json: false
  }).then(function(result) {
    var res = result[0], body = result[1];
    if (!body || res.statusCode < 200 || res.statusCode >= 300) {
      throw new Error({
        message: "Unable to load file from URL '" + fileUrl + "'. Server did not send any blueprint back and responded with status code " + res.statusCode + "."
      });
    } else {
      return {
        raw: body,
        filename: fileUrl
      };
    }
  }, function(err) {
    var error = new Error({
      message: "Error when loading file from URL '" + fileUrl + "'. Is the provided URL correct?"
    });
    error.previous = err;
    throw error;
  });
}

function readLocalFile(filePath, readCallback) {
  return Q.ninvoke(fs, 'readFile', filePath, 'utf8')
    .then(function(data) {
      return {
        raw: data,
        filename: filePath
      };
    });
}

function parseBlueprints(data) {
  return Promise
    .map(Object.keys(data), make)
    .then(makeRuntimes);

  function make(file) {
    var drafter = new Drafter;
    return Promise.promisify(drafter.make).call(drafter, data[file]['raw'])
      .then(function(result) {
        data[file].parsed = result;
        return data[file];
      });
  }

  function makeRuntimes(results) {
    var warnings, runtimeError, warning;

    results.forEach(function(result) {
      var file = result.filename;
      var warnings = result['warnings'];
      var message, ranges, pos;
      if (warnings && warnings.length > 0) {
        warnings.forEach(function(warning) {
          message = ("Parser warning in file '" + file + "':") + ' (' + warning.code + ') ' + warning.message;
          ranges = blueprintUtils.warningLocationToRanges(warning['location'], result['raw']);
          if (ranges != null ? ranges.length : void 0) {
            pos = blueprintUtils.rangesToLinesText(ranges);
            message = message + ' on ' + pos;
          }
          logger.warn(message);
        });
      }
    });

    var runtimes = {
      warnings: [],
      errors: [],
      transactions: [],
      routeMap: {}
    };
    // REM
    //var routeMap = runtimes.routeMap;

    results.forEach(function(result) {
      var file = result.filename;
      var runtime = blueprintTransactions.compile(result['parsed']['ast'], file);
      runtimes['warnings'] = runtimes['warnings'].concat(runtime['warnings']);
      runtimes['errors'] = runtimes['errors'].concat(runtime['errors']);
      runtimes['transactions'] = runtimes['transactions'].concat(runtime['transactions']);

      // REM
      //var ast = result.parsed.ast;
      //ast.resourceGroups.forEach(function(resourceGroup) {
      //  resourceGroup.resources.forEach(function(resource) {
      //    var parsedUrl = urlParser.parse(resource.uriTemplate);
      //    var key = parsedUrl.url;
      //
      //    routeMap[key] = routeMap[key] || { urlExpression: key, methods: {} };
      //    //parseParameters(parsedUrl, resource.parameters, routeMap);
      //    resource.actions.forEach(function(action){
      //      parseAction(parsedUrl, action, routeMap);
      //    });
      //  });
      //});
    });
    runtimeError = handleRuntimeProblems(runtimes);
    if (runtimeError) {
      throw runtimeError;
    } else {
      return runtimes;
    }
  }

  // REM
  //function parseAction(parsedUrl, action, routeMap) {
  //  var key = parsedUrl.url;
  //
  //  routeMap[key].methods[action.method] = routeMap[key].methods[action.method] || [];
  //  var routeHandlers = getRouteHandlers(key, parsedUrl, action);
  //  Array.prototype.push.apply(routeMap[key].methods[action.method], routeHandlers);
  //
  //  console.log('[LOG]'.white, 'Setup Route:', action.method.green, key.yellow, action.name.blue);
  //
  //  function getRouteHandlers(method, parsedUrl, action) {
  //    return action.examples.map(function(example) {
  //      var specPairs = example.responses.map(function(response, index){
  //        return {
  //          response: response,
  //          request: 'undefined' === typeof example.requests[index]
  //            ? null
  //            : specSchema.validateAndParseSchema(example.requests[index])
  //        };
  //      });
  //      return {
  //        parsedUrl: parsedUrl,
  //        execute: getResponseHandler(specPairs)
  //      }
  //    });
  //  }
  //
  //  function getResponseHandler(specPairs) {
  //    return function(req, res) {
  //      return specPairs.some(function(specPair){
  //        if (content.matches(req, specPair)) {
  //          logger.log('[GAVLING]'.red, action.method.green, parsedUrl.uriTemplate.yellow, (specPair.request && specPair.request.description ? specPair.request.description : action.name).blue);
  //
  //          console.log('pair', specPair)
  //
  //          //specPair.response.headers.forEach(function (header) {
  //          //  res.set(header.name, header.value);
  //          //});
  //          //res.status(+specPair.response.name);
  //          //res.send(buildResponseBody(specPair.response.body));
  //          return true;
  //        }
  //      });
  //    };
  //  }
  //}
  //
}

function decorateResult(prefix, result, messageGlue, isValid) {
  var message = [],
    warnings = [],
    errors = [];
  _.forOwn(result, function(data, resultKey) {
    if (resultKey !== 'version') {
      data.results.forEach(function(result) {
        var msg = '[' + prefix + '.' + resultKey + '] ' + result.message;
        message.push(msg);
        if (result.severity === 'error') {
          errors.push(msg);
        } else if (result.severity === 'warning') {
          warnings.push(msg);
        } else {
          throw new Error("TODO Unexpected severity: " + result.severity);
        }
      });
    }
  });

  result.valid = !!isValid;
  result.message = message.join(messageGlue || "\n");
  result.errors = errors;
  result.warnings = warnings;

  return result;
}
