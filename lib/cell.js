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

  debug(key + " cell initialized");
}

SporeCell.prototype.toJSON = function () {
  var json = {};
  json[this.key] = this.id;

  return json;
};

SporeCell.prototype.value = function () {
  if(Errors.noValue.test(this._value)) throw this._value;

  var kv = {};
  kv[this.key] = this._value;

  return kv;
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
    val = this.value();
  } catch(e) {
    if(!Errors.noValue.test(e)) return callback(e);

    this._load(function (err, val) {
      if(err) return callback(err);

      callback(null, val);
    });
    return;
  }

  callback(null, val);

  return;
};

SporeCell.prototype.setValue = function (val, callback) {
  // an id maps to one key/value pair, so we need a new one
  this.id = uuid();
  this._value = val;

  this._save(function (err) {
    if(err) return callback(err);
    callback(null, this);
  });

  return this;
};

SporeCell.prototype._save = function (callback) {
  var self = this,
      value;

  try {
    value = this.value();
  } catch(e) {
    return callback(e);
  }

  fs.ensureDir(path.dirname(this.path()), function (err) {
    if(err) return callback(err);

    fs.writeFile(self.path(), stringify(value), { flags: 'wx' }, function (err) {
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

    fs.readJson(self.path(), function (err, json) {
      if(err && err.code === 'ENOENT') {

        // TODO: load from server
        
        err = Errors.noCache.build(self.fullName());
      }
      if(!err && Object.keys(json).length !== 1) {
        err = Errors.wrongCellFormat.build(self.fullName());
      }
      if(err) return callback(err);

      debug("Cell loaded for " + this.key);

      var key = Object.keys(json)[0],
          value = json[key];

      debug("Updating key to " + key);
      self.key = key;
      self._value = value;

      callback(null, value);
    });
  });
};
