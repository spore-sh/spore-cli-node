var Errors = require('./errors');

module.exports = SporeCell;

function SporeCell(env, key, id) {
  this.env = env;
  this.key = key;
  this.id = id;
  this.value = Errors.noValue.build(key);
}

SporeCell.prototype.toJSON = function () {
  var json = {};
  json[key] = this.id;

  return json;
};

SporeCell.prototype.load = function (callback) {
  var self = this;

  this.env.loadCell(this, function (err, value) {
    if(err) return callback(err);

    self.value = value;

    callback(null, self);
  });

  return this;
};
