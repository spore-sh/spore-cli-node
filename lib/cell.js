var Errors = require('spore-errors'),
    debug = require('debug')('spore-cli'),
    uuid = require('node-uuid').v4,
    path = require('path'),
    resolvePath = require('./utils/resolve_path'),
    stringify = require('./utils/stringify'),
    fs = require('fs-extra');

module.exports = Cell;

function Cell(env, key, id) {
  this.env = env;
  this.key = key;
  this.id = id || uuid();
  this._value = Errors.noValue.build(this.fullName());

  debug(this.fullName() + " cell initialized");
}

Cell.prototype.api = function () {
  return this.env.api.apply(this.env, [].slice.call(arguments));
};

Cell.prototype.isDeployment = function () {
  return this.env.isDeployment.apply(this.env, [].slice.call(arguments));
};

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

Cell.prototype.cellFileFormat = function () {
  return {
    id: this.id,
    value: this.value(),
    key: this.key,
    name: this.fullName(),
    remote: this.remotePath()
  };
};

Cell.prototype.value = function (val) {
  if(arguments.length) {
    if(typeof val !== 'string') {
      throw Errors.onlyStrings.build(this.fullName());
    }
    this._value = val;
  }

  if(Errors.noValue.test(this._value)) throw this._value;

  if(typeof this._value !== 'string') {
    throw Errors.onlyStrings.build(this.fullName());
  }

  return this._value;
};

Cell.prototype.getKv = function (callback) {
  var key = this.key;

  this.getValue(function (err, val) {
    if(err) return callback(err);

    var kv = {};
    kv[key] = val;

    callback(null, kv);
  });
};

Cell.prototype.getValue = function (callback) {
  var val;

  debug("Getting cell value for " + this.key);

  try {
    val = this.value();
  } catch(e) {
    if(!Errors.noValue.test(e)) return callback(e);

    this._load(function (err, cell) {
      if(err) return callback(err);

      callback(null, cell.value());
    });
    return;
  }

  callback(null, val);

  return;
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
    contents = this.cellFileFormat();
  } catch(e) {
    return callback(e);
  }

  self._remoteSave(contents, callback);
};

Cell.prototype._remoteSave = function (contents, callback) {
  var self = this;

  debug("Saving " + this.fullName() + " to the remote");

  this.api(function (err, api) {
    if(err) return callback(err);

    debug("Sending API request to create cell for " + self.fullName());

    api.cells.create(self.remotePath(), contents, callback);
  });
};

Cell.prototype._load = function (callback) {
  var self = this;

  debug("Loading remote cell value for " + this.fullName());

  this.api(function (err, api) {
    if(err) return callback(err);

    debug("api.cells.get " + self.remotePath());

    api.cells.get(self.remotePath(), function (err, json) {
      if(err) return callback(err);

      debug("Got cell " + self.fullName() + " from Pod");

      self.loadJson(json, callback);
    });
  });
};

Cell.prototype.loadJson = function (json, callback) {
  debug("Loading cell JSON for " + this.fullName());

  try {

    this.value(json.value);

  } catch(e) {
    return callback(e);
  }

  callback(null, this);
};
