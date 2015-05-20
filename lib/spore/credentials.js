var debug = require('debug')('spore-cli'),
    async = require('async'),
    Credentials = require('spore').Credentials;

module.exports = Credentials;

Credentials.prototype.signup = function (email, password, callback) {
  var self = this;

  debug("Signing up for Spore pod");

  this.api().users.signup(email, password, function (err, user) {
    if(err) return callback(err);

    debug("Sign up successful, saving credentials to netrc");

    self.setKey(user.email, user.key, callback);
  });
};

Credentials.prototype.login = function (email, password, callback) {
  var self = this;

  debug("Logging into Spore pod");

  this.api().users.login(email, password, function (err, key) {
    if(err) return callback(err);

    debug("Log in successful, saving credentials to netrc");

    self.setKey(email, key, callback);
  });
};

Credentials.prototype.verify = function (token, callback) {
  debug("Verifying email address");

  this.api().users.verify(token, callback);
};

Credentials.prototype.setKey = function (email, key, callback) {
  debug("Setting key for Spore pod");

  if(this.deployment) {
    return callback(new Error("You can't set credentials in a deployment environment"));
  }

  this._setLocalKey(email, key, callback);
};

Credentials.prototype._setLocalKey = function (email, key, callback) {
  var self = this;

  if(!key) throw new Error("Key can't be blank.");
  if(!email) throw new Error("Email can't be blank.");

  if(!this.netrc().hasHost(this.hostname())) {
    debug(this.netrc().filename + " does not have a host entry for " + this.hostname() + " - adding a new one");
    this.netrc().addMachine(this.hostname());
  }

  this.netrc().host(this.hostname()).login = email;
  this.netrc().host(this.hostname()).password = key;

  debug("Saving .netrc to disk");
  this.netrc().write();
};
