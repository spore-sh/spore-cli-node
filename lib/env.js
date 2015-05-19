var merge = require('merge'),
    debug = require('debug')('spore-cli'),
    async = require('async'),
    slug = require('slug'),
    mixin = require('./utils/mixin'),
    Errors = require('spore-errors'),
    Cell = require('./cell'),
    Permissions = require('./env/permissions'),
    GetSet = require('./env/get_set'),
    resolvePath = require('./utils/resolve_path');

module.exports = Env;

function Env(app, name, ids) {
  mixin(this, Permissions);
  mixin(this, GetSet);

  var self = this;
  this.app = app;
  this.name = slug(name);
  this.cells = [];

  Object.keys(ids || {}).forEach(function (key) {
    self.cells.push(new self.constructor.Cell(self, key, ids[key]));
  });

  debug(name + " environment initialized");
}

Env.Cell = Cell;

Env.prototype.api = function () {
  return this.app.api.apply(this.app, [].slice.call(arguments));
};

Env.prototype.isDeployment = function () {
  return this.env.isDeployment.apply(this.env, [].slice.call(arguments));
};

Env.prototype.toJSON = function () {
  var json = {};
  this.cells.forEach(function (cell) {
    json = merge(json, cell.toJSON());
  });
  return json;
};

Env.prototype.path = function () {
  return resolvePath(this.app.path(), this.name);
};

Env.prototype.remotePath = function () {
  return this.app.remotePath() + '/' + this.name;
};

Env.prototype.fullName = function () {
  return this.app.fullName() + '/' + this.name;
};

Env.prototype.newCell = function (key, id) {
  var cell = new this.constructor.Cell(this, key, id);
  this.cells.push(cell);
  return cell;
};

Env.prototype.findCellByKey = function (key) {
  for(var i=0; i<this.cells.length; i++) {
    if(this.cells[i].key === key) return this.cells[i];
  }

  return this.newCell(key);
};
