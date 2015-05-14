var merge = require('merge'),
    debug = require('debug')('spore-cli'),
    async = require('async'),
    util = require('util'),
    Errors = require('./errors'),
    SporeCell = require('./cell'),
    SporeEnvPermissions = require('./env/permissions'),
    SporeEnvGetSet = require('./env/get_set'),
    resolvePath = require('./utils/resolve_path');

module.exports = SporeEnv;

function SporeEnv(app, name, ids) {
  SporeEnvPermissions.call(this);
  SporeEnvGetSet.call(this);

  var self = this;
  this.app = app;
  this.name = name;
  this.cells = [];

  Object.keys(ids || {}).forEach(function (key) {
    self.cells.push(new self.constructor.Cell(self, key, ids[key]));
  });

  debug(name + " environment initialized");
}

util.inherits(SporeEnv, SporeEnvPermissions);
util.inherits(SporeEnv, SporeEnvGetSet);

SporeEnv.Cell = SporeCell;

SporeEnv.prototype.api = function () {
  return this.app.api.apply(this.app, [].slice.call(arguments));
};

SporeEnv.prototype.toJSON = function () {
  var json = {};
  this.cells.forEach(function (cell) {
    json = merge(json, cell.toJSON());
  });
  return json;
};

SporeEnv.prototype.path = function () {
  return resolvePath(this.app.path(), this.name);
};

SporeEnv.prototype.remotePath = function () {
  return this.app.remotePath() + '/' + this.name;
};

SporeEnv.prototype.fullName = function () {
  return this.app.fullName() + '/' + this.name;
};

SporeEnv.prototype.newCell = function (key, id) {
  var cell = new this.constructor.Cell(this, key, id);
  this.cells.push(cell);
  return cell;
};

SporeEnv.prototype.findCellByKey = function (key) {
  for(var i=0; i<this.cells.length; i++) {
    if(this.cells[i].key === key) return this.cells[i];
  }

  return this.newCell(key);
};
