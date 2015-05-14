var debug = require('debug')('spore-cli'),
    async = require('async'),
    merge = require('merge');

module.exports = SporeAppPermissions;

function SporeAppPermissions() {}

SporeAppPermissions.prototype.grant = function (envName, email, callback) {
  var self = this,
      env = this.findEnv(envName);

  debug("Granting read permission to " + email + " for " + env.fullName());

  debug("Saving " + this.fullName() + " before granting");

  this.save(function (err) {
    if(err) return callback(err);

    env.grant(email, callback);
  });
};

SporeAppPermissions.prototype.grantAll = function (email, callback) {
  var self = this;

  debug("Granting read permission to " + email + " for all environments");

  async.each(this.envs, function (env, next) {
    env.grant(email, next);
  }, callback);
};

SporeAppPermissions.prototype.revoke = function (envName, email, callback) {
  var self = this,
      env = this.findEnv(envName);

  debug("Revoking read permission from " + email + " for " + env.fullName());

  debug("Saving " + this.fullName() + " before revoking");

  this.save(function (err) {
    if(err) return callback(err);

    env.revoke(email, callback);
  });
};

SporeAppPermissions.prototype.revokeAll = function (email, callback) {
  var self = this;

  debug("Revoking read permissions from " + email + " for all environments");

  async.each(this.envs, function (env, next) {
    env.revoke(email, next);
  }, callback);
};

SporeAppPermissions.prototype.users = function (envName, callback) {
  var self = this;
      env = this.findEnv(envName);

  debug("Listing users with read permissions for " + env.fullName());

  debug("Saving " + this.fullName() + " before checking permissions");

  this.save(function (err) {
    if(err) return callback(err);

    env.users(callback);
  });
};

SporeAppPermissions.prototype.allUsers = function (callback) {
  var self = this,
      allUsers = {};

  debug("Listing users with read permissions for all environments on " + this.fullName());

  async.map(this.envs, function (env, next) {
    env.users(function (err, users) {
      if(err) return callback(err);

      var envUsers = {};
      envUsers[env.name] = users;

      next(null, envUsers);
    });
  }, function (err, allUsers) {
    if(err) return callback(err);

    callback(null, merge.apply(null, allUsers));
  });
};
