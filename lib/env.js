var merge = require('merge'),
    Cell = require('./cell'),
    Env = require('spore').App.Env;

module.exports = Env;

Env.Cell = Cell;

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


Env.prototype.createDeployment = function (name, callback) {
  return this.api().deployments.create(this.app.id, this.name, { name: name }, callback);
};

Env.prototype.removeDeployment = function (name, callback) {
  return this.api().deployments.destroy(this.app.id, this.name, { name: name }, callback);
};

Env.prototype.set = function (key, value, callback) {
  debug("Setting " + key + " for " + this.fullName());

  var cell = this.findCellByKey(key);

  return cell.setValue(value, callback);
};

Env.prototype.grant = function (email, callback) {
  return this.api().memberships.grant(this.app.id, this.name, email, callback);
};

Env.prototype.revoke = function (email, callback) {
  return this.api().memberships.revoke(this.app.id, this.name, email, callback);
};

Env.prototype.users = function (callback) {
  return this.api().memberships.list(this.app.id, this.name, callback);
};
