var debug = require('debug')('spore-cli'),
    Config = require('spore').Config;

module.exports = Config;

Config.prototype.setCredentials = function (email, key, callback) {
  debug("Setting key for Spore pod");

  if(this.deployment) {
    return callback(new Error("You can't set credentials in a deployment environment"));
  }

  this._setLocalCreds(email, key, callback);
};

Config.prototype._setLocalCreds = function (email, key, callback) {
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
