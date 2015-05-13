var Errors = require('./errors'),
    debug = require('debug')('spore-cli'),
    uuid = require('node-uuid').v4,
    path = require('path'),
    resolvePath = require('./utils/resolve_path'),
    stringify = require('./utils/stringify'),
    fs = require('fs-extra');

module.exports = SporeCell;

function SporeCell(env, key, id) {
  this.env = env;
  this.key = key;
  this.id = id || uuid();
  this._value = Errors.noValue.build(this.fullName());

  debug(this.fullName() + " cell initialized");
}

SporeCell.prototype.toJSON = function () {
  var json = {};
  json[this.key] = this.id;

  return json;
};

SporeCell.prototype.path = function () {
  return resolvePath(this.env.path(), this.id);
};

SporeCell.prototype.fullName = function () {
  return this.env.fullName() + "/" + this.key;
};

SporeCell.prototype.cellFileFormat = function () {
  var json = {};
  json.id = this.id;
  json.value = this.value();
  json.key = this.key;
  json.name = this.fullName();

  return json;
};

SporeCell.prototype.value = function (val) {
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

SporeCell.prototype.getKv = function (callback) {
  var key = this.key;

  this.getValue(function (err, val) {
    if(err) return callback(err);

    var kv = {};
    kv[key] = val;

    callback(null, kv);
  });
};

SporeCell.prototype.getValue = function (callback) {
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

SporeCell.prototype.setValue = function (val, callback) {
  // an id maps to one key/value pair, so we need a new one
  this.id = uuid();
  this.value(val);

  this._save(function (err) {
    if(err) return callback(err);
    callback(null, this);
  });

  return this;
};

SporeCell.prototype._save = function (callback) {
  var self = this,
      contents;

  debug("Saving cell value for " + this.fullName());  

  try {
    contents = this.cellFileFormat();
  } catch(e) {
    return callback(e);
  }

  debug("Ensuring " + path.dirname(this.path()) + " exists");

  fs.ensureDir(path.dirname(this.path()), function (err) {
    if(err) return callback(err);

    debug("Writing value of " + self.fullName() + " to local cache");

    fs.writeFile(self.path(), stringify(contents), { flags: 'wx' }, function (err) {
      if(err) return callback(err);

      debug("Value of " + self.fullName() + " written to local cache");

      // TODO: write to server
      
      callback();
    });
  });
};

SporeCell.prototype._load = function (callback) {
  var self = this;

  debug("Loading cell value for " + this.key);

  fs.ensureDir(path.dirname(this.path()), function (err) {
    if(err) return callback(err);

    fs.readJson(self.path(), function (err, json) {
      if(err && err.code === 'ENOENT') {

        // TODO: load from server
        
        err = Errors.noCache.build(self.fullName());
      }
      if(err) return callback(err);

      debug("Cell loaded for " + self.fullName());

      var value = json.value;

      self.value(value);

      callback(null, self);
    });
  });
};
