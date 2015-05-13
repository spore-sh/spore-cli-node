exports.noAppFound = errType('SPORE_NO_APP', function (sporeFile, dir) {
  return "No " + sporeFile + " found in " + dir;
});

exports.appExists = errType('SPORE_APP_EXISTS', function (dir) {
  return "A Spore app already exists in " + dir;
});

exports.noValue = errType('SPORE_CELL_UNDEFINED', function (cellName) {
  return "No value has been specified for " + cellName;
});

exports.noCache = errType('SPORE_CELL_NOT_CACHED', function (cellName) {
  return "No value in the Spore cache for " + cellName;
});

exports.notLoaded = errType('SPORE_APP_NOT_LOADED', function (appName) {
  return "The Spore app " + appName + " has not been loaded yet.";
});

exports.onlyStrings = errType('SPORE_CELL_ONLY_STRINGS', function () {
  return "Only strings are allowed to be set as values";
});

exports.wrongCellFormat = errType('SPORE_CELL_INVALID_FORMAT', function (cellName) {
  return "The cell " + cellName + " was saved in an invalid format";
});

function errType(code, msgFn) {
  return {
    code: code,
    build: function () {
      var err = new Error(msgFn.apply(this, [].slice.call(arguments)));
      err.code = this.code;
      return err;
    },
    test: function (err) {
      return err && err.code === this.code;
    }
  };
}
