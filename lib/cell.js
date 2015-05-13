var Errors = require('./errors'),
    debug = require('debug')('spore-cli'),
    uuid = require('node-uuid').v4,
    path = require('path'),
    resolvePath = require('./utils/resolve_path'),
    fs = require('fs-extra');

module.exports = SporeCell;

function SporeCell(env, key, id) {
  this.env = env;
  this.key = key;
  this.id = id || uuid();
  this.value = Errors.noValue.build(this.fullName());

  debug(key + " cell initialized");
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

SporeCell.prototype.getValue = function (callback) {
  var val;

  debug("Getting cell value for " + this.key);

  try {
    val = this._kv();
  } catch(e) {
    if(!Errors.noValue.test(e)) return callback(e);

    this._load(function (err, cell) {
      if(err) return callback(err);

      callback(null, cell._kv());
    });
    return;
  }

  callback(null, val);

  return;
};

SporeCell.prototype.setValue = function (val, callback) {
  // an id maps to one key/value pair, so we need a new one
  this.id = uuid();
  this.value = val;

  this._save(function (err) {
    if(err) return callback(err);
    callback(null, this);
  });

  return this;
};

Spore.prototype._save = function (app, env, cell, callback) {
  var self = this;

  fs.ensureDir(path.dirname(this.path()), function (err) {
    if(!err && Errors.noValue.test(self.value)) {
      err = self.value;
    }
    if(err) return callback(err);

    fs.writeFile(self.path(), self.value, { flags: 'wx' }, function (err) {
      if(err) return callback(err);

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

    fs.readFile(self.path(), function (err, val) {
      if(err && err.code === 'ENOENT') {
        // TODO: load from server
        err = Errors.noCache.build(self.fullName());
      }
      if(err) return callback(err);

      self.value = value;

      callback(null, val);
    });
  });
};

SporeCell.prototype._kv = function () {
  if(Errors.noValue.test(this.value)) throw this.value;

  var kv = {};
  kv[this.key] = this.value;

  return kv;
};
