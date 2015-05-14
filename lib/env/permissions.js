module.exports = SporeEnvPermissions;

function SporeEnvPermissions() {}

SporeEnvPermissions.prototype.grant = function (email, callback) {
  var self = this;

  this.api(function (err, api) {
    if(err) return callback(err);

    api.grant(self.app.id, self.name, email, callback);
  });
};

SporeEnvPermissions.prototype.revoke = function (email, callback) {
  var self = this;

  this.api(function (err, api) {
    if(err) return callback(err);

    api.revoke(self.app.id, self.name, email, callback);
  });
};

SporeEnvPermissions.prototype.users = function (callback) {
  var self = this;

  this.api(function (err, api) {
    if(err) return callback(err);

    api.users(self.app.id, self.name, callback);
  });
};
