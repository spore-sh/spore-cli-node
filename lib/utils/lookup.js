var debug = require('debug')('spore-cli'),
    async = require('async'),
    path = require('path'),
    fs = require('fs-extra');

module.exports = lookupName;

function lookupName(dir, name, callback) {

  debug("Looking up a name for " + dir);

  if(name) {
    debug("Name already set, returning");
    process.nextTick(function () {
      callback(null, name);
    });
    return;
  }

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
}

var lookups = {
  rails: function (dir, callback) {
    debug("Checking for a Rails application name");

    // TODO: add name lookup for Rails apps
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
