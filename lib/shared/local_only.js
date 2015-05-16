var fs = require('fs-extra'),
    path = require('path'),
    touch = require('touch'),
    debug = require('debug')('spore-cli'),
    stringify = require('../utils/stringify');

module.exports = SporeLocalOnly;

function SporeLocalOnly() {}

SporeLocalOnly.prototype.addToLocalOnly = function (callback) {
  var self = this,
      dir = path.dirname(this.localOnlyPath());

  debug("Marking " + this.fullName() + " as local only");

  debug("Ensure that the local only directory (" + dir + ") exists");

  fs.ensureDir(dir, function (err) {
    if(err) return callback(err);

    debug("Write to " + self.localOnlyPath() + " to mark as local only");
    fs.writeFile(self.localOnlyPath(), stringify(self.localOnlyFormat()), callback);
  });
};

SporeLocalOnly.prototype.removeFromLocalOnly = function (callback) {
  var self = this,
      dir = path.dirname(this.localOnlyPath());

  debug("Marking " + this.fullName() + " as no longer local only");

  this.localOnly = false;

  debug("Ensure that the local only apps directory (" + dir + ") exists");

  fs.ensureDir(dir, function (err) {
    if(err) return callback(err);

    debug("Removing " + self.localOnlyPath() + " to mark as no longer local only");

    fs.unlink(self.localOnlyPath(), function (err) {
      if(err && err.code === 'ENOENT') {
        debug(self.fullName() + " did not have a local only file, ignoring.");

        return callback(null, self);
      }
      if(err) return callback(err);

      callback(null, self);
    });
  });
};
