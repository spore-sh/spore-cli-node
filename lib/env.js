var merge = require('merge'),
    debug = require('debug')('spore-cli'),
    async = require('async'),
    Errors = require('./errors'),
    SporeCell = require('./cell');

module.exports = SporeEnv;

function SporeEnv(app, name, values) {
  var self = this;
  this.app = app;
  this.name = name;
  this.cells = [];

  Object.keys(values || {}).forEach(function (key) {
    self.cells.push(new self.constructor.Cell(self, key, values[key]));
  });

  debug(name + " environment initialized");
}

SporeEnv.Cell = SporeCell;

SporeEnv.prototype.toJSON = function () {
  var json = {};
  this.cells.forEach(function (cell) {
    json = merge(json, cell.toJSON());
  });
  return json;
};

SporeEnv.prototype.values = function (callback) {
  debug("Loading values for the " + this.name + " environment");

  if(!this.cells.length) {
    process.nextTick(function () {
      callback(null, {});
    });
    return;
  }

  async.mapLimit(this.cells, 100, function (cell, next) {
    cell.getValue(next);
  }, function (err, vals) {
    if(err) return callback(err);

    callback(null, merge.apply(null, vals));
  });
};

SporeEnv.prototype.loadCell = function (cell, callback) {
  this.app.loadCell(this, cell, callback);
};
