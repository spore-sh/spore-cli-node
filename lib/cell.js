var Errors = require('./errors'),
    debug = require('debug')('spore-cli'),
    uuid = require('node-uuid').v4;

module.exports = SporeCell;

function SporeCell(env, key, id) {
  this.env = env;
  this.key = key;
  this.id = id || uuid();
  this.value = Errors.noValue.build(key);

  debug(key + " cell initialized");
}

SporeCell.prototype.toJSON = function () {
  var json = {};
  json[this.key] = this.id;

  return json;
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

  this.env.saveCell(this, function (err) {
    if(err) return callback(err);
    callback(null, this);
  });

  return this;
};

SporeCell.prototype._kv = function () {
  if(Errors.noValue.test(this.value)) throw this.value;

  var kv = {};
  kv[this.key] = this.value;
};

SporeCell.prototype._load = function (callback) {
  var self = this;

  debug("Loading cell value for " + this.key);

  this.env.loadCell(this, function (err, value) {
    if(err) return callback(err);

    self.value = value;

    callback(null, self);
  });

  return this;
};
