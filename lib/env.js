var merge = require('merge'),
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
}

SporeEnv.Cell = SporeCell;

SporeEnv.prototype.toJSON = function () {
  var json = {};
  this.cells.forEach(function (cell) {
    json = merge(json, cell.toJSON());
  });
  return json;
};
