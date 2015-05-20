var debug = require('debug')('spore-cli'),
    uuid = require('node-uuid').v4,
    Cell = require('spore').App.Env.Cell;

module.exports = Cell;

Cell.prototype.toJSON = function () {
  var json = {};
  json[this.key] = this.id;

  return json;
};

Cell.prototype.remotePath = function () {
  return this.env.remotePath() + '/' + this.id;
};

Cell.prototype.fullName = function () {
  return this.env.fullName() + '/' + this.key;
};

Cell.prototype.format = function () {
  return {
    id: this.id,
    value: this.value(),
    key: this.key,
    name: this.fullName(),
    remote: this.remotePath()
  };
};

Cell.prototype.setValue = function (val, callback) {
  // an id maps to one key/value pair, so we need a new one
  this.id = uuid();
  this.value(val);

  this._save(function (err) {
    if(err) return callback(err);
    callback(null, this);
  });

  return this;
};

Cell.prototype._save = function (callback) {
  var self = this,
      contents;

  debug("Saving cell value for " + this.fullName());

  if(this.isDeployment()) {
    debug("We're in a deployment environment, skipping the save");

    process.nextTick(function () {
      callback(null, self);
    });

    return;
  }

  try {
    contents = this.format();
  } catch(e) {
    return callback(e);
  }

  self._remoteSave(contents, callback);
};

Cell.prototype._remoteSave = function (contents, callback) {
  var self = this;

  debug("Saving " + this.fullName() + " to the remote");

    debug("Sending API request to create cell for " + self.fullName());

  this.api().cells.create(self.remotePath(), contents, callback);
};
