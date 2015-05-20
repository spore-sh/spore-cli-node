var debug = require('debug')('spore-cli'),
    async = require('async'),
    Errors = require('spore-errors'),
    SporeAppGetSet = require('spore').App.GetSet;

module.exports = SporeAppGetSet;

SporeAppGetSet.prototype.set = function (envName, key, value, callback) {
  var self = this,
      env = this.findEnv(envName);

  env.set(key, value, function (err) {
    if(err) return callback(err);

    self.save(callback);
  });
};

SporeAppGetSet.prototype.setAll = function (key, value, callback) {
  var self = this;

  debug("Setting " + key + " for all environments of " + this.fullName());

  if(!this.envs.length) {
    return callback(Errors.noEnvs.build(this.fullName()));
  }

  async.each(this.envs, function (env, next) {

    env.set(key, value, next);

  }, function (err) {
    if(err) return callback(err);

    self.save(callback);
  });
};
