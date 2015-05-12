var Errors = require('./errors'),
    debug = require('debug')('spore-cli');

module.exports = SporeCell;

function SporeCell(env, key, id) {
  this.env = env;
  this.key = key;
  this.id = id;
  this.value = Errors.noValue.build(key);

  debug(key + " cell initialized");
}

SporeCell.prototype.toJSON = function () {
  var json = {};
  json[key] = this.id;

  return json;
};

SporeCell.prototype.getValue = function (callback) {
  var val;

  debug("Getting cell value for " + this.key);

  try {
    val = this.kv();
  } catch(e) {
    if(!Errors.noValue.test(e)) return callback(e);

    this.load(function (err, cell) {
      if(err) return callback(err);

      callback(null, cell.kv());
    });
    return;
  }

  callback(null, val);

  return;
};

SporeCell.prototype.kv = function () {
  if(Errors.noValue.test(this.value)) throw this.value;

  var kv = {};
  kv[key] = this.value;
};

SporeCell.prototype.load = function (callback) {
  var self = this;

  debug("Loading cell value for " + this.key);

  this.env.loadCell(this, function (err, value) {
    // TODO: load from server if not stored locally
    if(err) return callback(err);

    self.value = value;

    callback(null, self);
  });

  return this;
};
