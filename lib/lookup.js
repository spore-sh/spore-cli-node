var debug = require('debug')('spore-cli'),
    async = require('async'),
    path = require('path'),
    fs = require('fs-extra');

module.exports = SporeLookup();

function SporeLookup() {

}

SporeLookup.prototype.lookupName = function (dir, callback) {

  debug("Looking up a name for " + dir);

  async.eachSeries(Object.keys(lookups).sort(), function (lookupName, next) {
    var lookup = lookups[lookupName];

    lookup.call(null, dir, function (err, name) {
      if(err) return next(err);
      if(name) return callback(null, name);
      next();
    });

  }, function (err, name) {
    if(err) return callback(err);
    if(name) return callback(null, name);

    debug("No framework-specific application names found, falling back on directory name");

    callback(null, path.basename(dir));
  });
};

var lookups = {
  rails: function (dir, callback) {
    debug("Checking for a Rails application name");

    // TODO
    process.nextTick(function () {
      callback();
    });
  },
  node: function (dir, callback) {
    debug("Checking for a Node.js application name");

    fs.readJson(path.join(dir, 'package.json'), function (err, json) {
      if(err && err.code === 'ENOENT') return callback();
      if(err) return callback(err);
      callback(null, json.name);
    });
  }
};
