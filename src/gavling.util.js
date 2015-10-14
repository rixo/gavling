'use strict';

var Q = require('q');
var blueprintTransactions = require('blueprint-transactions');
var glob = require('glob');
var request = require('request');
var fs = require('fs');
var url = require('url');
var Drafter = require('drafter');
var blueprintUtils = require('dredd/lib/blueprint-utils');
var handleRuntimeProblems = require('dredd/lib/handle-runtime-problems');
var logger = console;

module.exports = {
  expandGlobs: expandGlobs,
  loadFiles: loadFiles,
  parseBlueprints: parseBlueprints
};

function expandGlobs(path, configDataIsPresent) {

  if (!Array.isArray(path)) {
    path = [path];
  }

  return Q.all(path.map(promiseGlob))
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
    return Q.promise(function(resolve, reject) {
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

  return Q.all(files.map(promiseReadFile))
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
  return Q.all(Object.keys(data).map(make))
    .then(makeRuntimes);

  function make(file) {
    return Q.ninvoke(new Drafter, 'make', data[file]['raw'])
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
      transactions: []
    };
    results.forEach(function(result) {
      var file = result.filename;
      var runtime = blueprintTransactions.compile(result['parsed']['ast'], file);
      runtimes['warnings'] = runtimes['warnings'].concat(runtime['warnings']);
      runtimes['errors'] = runtimes['errors'].concat(runtime['errors']);
      runtimes['transactions'] = runtimes['transactions'].concat(runtime['transactions']);
    });
    runtimeError = handleRuntimeProblems(runtimes);
    if (runtimeError) {
      throw runtimeError;
    } else {
      return runtimes;
    }
  }
}
