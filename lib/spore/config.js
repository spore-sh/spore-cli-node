var debug = require('debug')('spore-cli'),
    fs = require('fs-extra'),
    path = require('path'),
    stringify = require('../utils/stringify'),
    Config = require('spore').Config;

module.exports = Config;

Config.prototype.setCredentials = function (email, key) {
  debug("Setting key for Spore pod");

  if(this.deployment) {
    return callback(new Error("You can't set credentials in a deployment environment"));
  }

  if(this._api) {
    this._api.setCredentials({ email: email, key: key });
  }

  this._setLocalCreds(email, key);
};

Config.prototype._setLocalCreds = function (email, key) {
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

Config.prototype._load = Config.prototype.load;

Config.prototype.load = function () {
  if(this.isDeployment()) {
    return this._load();
  }

  debug("Checking for local config at " + this.path() + " to see if we need to write default config to disk");

  try {
    fs.readFileSync(this.path());
  } catch(e) {
    if(e.code === 'ENOENT') {
      debug("No config file found, writing default to disk");

      fs.ensureDirSync(path.dirname(this.path()));
      fs.writeFileSync(this.path(), stringify(this.defaultConfig));

      debug("Default config written to " + this.path());
    }
  }

  return this._load();
};
