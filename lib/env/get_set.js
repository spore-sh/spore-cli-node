var async = require('async'),
    merge = require('merge'),
    debug = require('debug')('spore-cli');

module.exports = SporeEnvGetSet;

function SporeEnvGetSet() {}

SporeEnvGetSet.prototype.set = function (key, value, callback) {
  debug("Setting " + key + " for " + this.fullName());

  var cell = this.findCellByKey(key);

  return cell.setValue(value, callback);
};

SporeEnvGetSet.prototype.get = function (key, callback) {
  debug("Getting " + key + " for " + this.fullName());

  var cell = this.findCellByKey(key);

  return cell.getValue(callback);
};

SporeEnvGetSet.prototype.getAll = function (callback) {
  debug("Getting all values for " + this.fullName());

  if(!this.cells.length) {
    debug("No cells found for " + this.fullName());

    process.nextTick(function () {
      callback(null, {});
    });
    return;
  }

  debug("Loading " + this.cells.length + " for " + this.fullName());

  async.mapLimit(this.cells, 100, function (cell, next) {
    cell.getKv(next);
  }, function (err, vals) {
    if(err) return callback(err);

    callback(null, merge.apply(null, vals));
  });
};
