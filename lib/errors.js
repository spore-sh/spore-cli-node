exports.noAppFound = errType('SPORE_NO_APP', function (sporeFile, dir) {
  return "No " + sporeFile + " found in " + dir;
});

exports.appExists = errType('SPORE_APP_EXISTS', function (dir) {
  return "A Spore app already exists in " + dir;
});

exports.noValue = errType('SPORE_CELL_UNDEFINED', function (key) {
  return "No value has been specified for " + key;
});

exports.noCache = errType('SPORE_CELL_NOT_CACHED', function (appName, envName, key) {
  return "No value in the Spore cache for " + appName + "/" + envName + "/" + key;
});

function errType(code, msgFn) {
  return {
    code: code,
    build: function () {
      var err = new Error(msgFn.apply(this, [].slice.call(args)));
      err.code = this.code;
      return err;
    },
    test: function (err) {
      return err && err.code === this.code;
    }
  };
}
