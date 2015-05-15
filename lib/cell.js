var Errors = require('spore-errors'),
    debug = require('debug')('spore-cli'),
    uuid = require('node-uuid').v4,
    path = require('path'),
    resolvePath = require('./utils/resolve_path'),
    stringify = require('./utils/stringify'),
    mixin = require('./utils/mixin'),
    fs = require('fs-extra'),
    SporeLocalOnly = require('./local_only');

module.exports = SporeCell;

function SporeCell(env, key, id) {
  mixin(this, SporeLocalOnly);

  this.env = env;
  this.key = key;
  this.id = id || uuid();
  this._value = Errors.noValue.build(this.fullName());

  debug(this.fullName() + " cell initialized");
}

SporeCell.prototype.api = function () {
  return this.env.api.apply(this.env, [].slice.call(arguments));
};

SporeCell.prototype.toJSON = function () {
  var json = {};
  json[this.key] = this.id;

  return json;
};

SporeCell.prototype.path = function () {
  return resolvePath(this.env.path(), this.id);
};

SporeCell.prototype.remotePath = function () {
  return this.env.remotePath() + '/' + this.id;
};

SporeCell.prototype.localOnlyPath = function () {
  return resolvePath(this.env.app.spore.localOnlyCellsPath(), this.id);
};

SporeCell.prototype.fullName = function () {
  return this.env.fullName() + '/' + this.key;
};

SporeCell.prototype.cellFileFormat = SporeCell.prototype.localOnlyFormat = function () {
  return {
    id: this.id,
    value: this.value(),
    key: this.key,
    name: this.fullName(),
    remote: this.remotePath()
  };
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
  this.localOnly = true;

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

  this._localSave(contents, function (err) {
    if(err) return callback(err);

    self._remoteSave(contents, callback);
  });
};

SporeCell.prototype._localSave = function (contents, callback) {
  var self = this;

  debug("Saving local cache of " + this.fullName());

  debug("Ensuring " + path.dirname(this.path()) + " exists");

  fs.ensureDir(path.dirname(this.path()), function (err) {
    if(err) return callback(err);

    debug("Writing value of " + self.fullName() + " to local cache");

    fs.writeFile(self.path(), stringify(contents), { flags: 'wx' }, function (err) {
      if(err) return callback(err);

      debug("Value of " + self.fullName() + " written to local cache");

      callback(null, self);
    });
  });
};

SporeCell.prototype._remoteSave = function (contents, callback) {
  var self = this;

  if(!this.localOnly) {
    debug(this.fullName() + " already saved remotely");

    process.nextTick(function () {
      callback(null, self);
    });
    return;
  }

  debug("Saving " + this.fullName() + " to the remote");

  this.addToLocalOnly(function (err) {
    if(err) return callback(err);

    self._remoteSaveLocal(contents, callback);
  });
};

SporeCell.prototype._remoteSaveLocal = function (contents, callback) {
  var self = this;

  this.api(function (err, api) {
    if(err) return callback(err);

    debug("Sending API request to create cell for " + self.fullName());

    api.createCell(self.remotePath(), contents, function (err) {
      if(err && Errors.noConnection.test(err)) {
        debug("Can't save " + self.fullName() + " to remote due to lack of a connection. We'll try again later.");
        return callback(null, self);
      }

      if(err) return callback(err);

      self.removeFromLocalOnly(callback);
    });
  });
};

SporeCell.prototype._load = function (callback) {
  var self = this;

  debug("Loading cell value for " + this.key);

  this._localLoad(function (err, cell) {
    if(err && Errors.noCache.test(err)) {
      return self._remoteLoad(callback);
    }
    callback(err, cell);
  });
};

SporeCell.prototype._localLoad = function (callback) {
  var self = this;

  debug("Loading local cell value for " + this.fullName());

  fs.ensureDir(path.dirname(this.path()), function (err) {
    if(err) return callback(err);

    fs.readJson(self.path(), function (err, json) {
      if(err && err.code === 'ENOENT') {
        
        err = Errors.noCache.build(self.fullName());
      }
      if(err) return callback(err);

      debug("Local value loaded for " + self.fullName());

      self.loadJson(json, callback);
    });
  });
};

SporeCell.prototype._remoteLoad = function (callback) {
  var self = this;

  debug("Loading remote cell value for " + this.fullName());

  this.api(function (err, api) {
    if(err) return callback(err);

    debug("api.getCell " + self.remotePath());

    api.getCell(self.remotePath(), function (err, json) {
      if(err) return callback(err);

      debug("Got cell " + self.fullName() + " from Pod");

      self.loadJson(json, function (err) {
        if(err) return callback(err);

        debug("Marking " + self.fullName() + " as non-localOnly since we retrieved from the Pod");

        self.localOnly = false;

        self._save(callback);
      });
    });
  });
};

SporeCell.prototype.loadJson = function (json, callback) {
  debug("Loading cell JSON for " + this.fullName());

  try {

    this.value(json.value);

  } catch(e) {
    return callback(e);
  }

  callback(null, this);
};
