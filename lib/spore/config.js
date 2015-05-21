var debug = require('debug')('spore-cli'),
    Config = require('spore').Config;

module.exports = Config;

Config.prototype.setCredentials = function (email, key, callback) {
  debug("Setting key for Spore pod");

  if(this.deployment) {
    return callback(new Error("You can't set credentials in a deployment environment"));
  }

  if(this._api) {
    this._api.setCredentials({ email: email, key: key });
  }

  this._setLocalCreds(email, key, callback);
};

Config.prototype._setLocalCreds = function (email, key, callback) {
  var netrc = this.netrc(),
      hostname = this.parseHost().hostname;

  if(!key) throw new Error("Key can't be blank.");
  if(!email) throw new Error("Email can't be blank.");

  if(!netrc.hasHost(hostname)) {
    debug(netrc.filename + " does not have a host entry for " + hostname + " - adding a new one");
    netrc.addMachine(hostname);
  }

  netrc.host(hostname).login = email;
  netrc.host(hostname).password = key;

  debug("Saving .netrc to disk");
  netrc.write();
};
