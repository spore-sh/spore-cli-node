var merge = require('merge'),
    Cell = require('./cell'),
    Permissions = require('./env/permissions'),
    GetSet = require('./env/get_set'),
    Deployments = require('./env/deployments'),
    Cell = require('./cell');
    Env = require('spore').App.Env;

module.exports = Env;

[Permissions, Deployments].forEach(function (ctor) {
  Object.keys(ctor.prototype).forEach(function (methodName) {
    Env.prototype[methodName] = ctor.prototype[methodName];
  });
});

Env.Cell = Cell;
Env.GetSet = GetSet;

Env.prototype.toJSON = function () {
  var json = {};
  this.cells.forEach(function (cell) {
    json = merge(json, cell.toJSON());
  });
  return json;
};

Env.prototype.remotePath = function () {
  return this.app.remotePath() + '/' + this.name;
};
