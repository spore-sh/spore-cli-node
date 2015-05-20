module.exports = SporeEnvPermissions;

function SporeEnvPermissions() {}

SporeEnvPermissions.prototype.grant = function (email, callback) {
  return this.api().memberships.grant(this.app.id, this.name, email, callback);
};

SporeEnvPermissions.prototype.revoke = function (email, callback) {
  return this.api().memberships.revoke(this.app.id, this.name, email, callback);
};

SporeEnvPermissions.prototype.users = function (callback) {
  return this.api().memberships.list(this.app.id, this.name, callback);
};
