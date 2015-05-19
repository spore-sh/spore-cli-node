var debug = require('debug')('spore-cli'),
    async = require('async');

module.exports = Credentials;

function Credentials() {}

Credentials.prototype.signup = function (email, password, callback) {
  var self = this;

  debug("Signing up for Spore pod");

  this.api(function (err, api) {
    if(err) return callback(err);

    api.users.signup(email, password, function (err, user) {
      if(err) return callback(err);

      debug("Sign up successful, saving credentials to netrc");

      self.setKey(user.email, user.key, callback);
    });
  });
};

Credentials.prototype.login = function (email, password, callback) {
  var self = this;

  debug("Logging into Spore pod");

  this.api(function (err, api) {
    if(err) return callback(err);

    api.users.login(email, password, function (err, key) {
      if(err) return callback(err);

      debug("Log in successful, saving credentials to netrc");

      self.setKey(email, key, callback);
    });
  });
};

Credentials.prototype.verify = function (token, callback) {
  var self = this;

  debug("Verifying email address");

  this.api(function (err, api) {
    if(err) return callback(err);

    api.users.verify(token, callback);
  });
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

  debug("Setting key locally in netrc file");

  async.parallel({
    host: function (next) {
      self.parseHost(next);
    },
    netrc: function (next) {
      self.netrc(next);
    },
    api: function (next) {
      self.api(next);
    }
  }, function (err, results) {
    if(!err && !key) err = new Error("Key can't be blank.");
    if(!err && !email) err = new Error("Email can't be blank.");
    if(err) return callback(err);

    var hostname = results.host.hostname,
        netrc = results.netrc,
        api = results.api;

    try {
      if(!netrc.hasHost(hostname)) {
        debug(netrc.filename + " does not have a host entry for " + hostname + " - adding a new one");
        netrc.addMachine(hostname);
      }

      netrc.host(hostname).login = email;
      netrc.host(hostname).password = key;

      debug("Setting credentials in this instance of the api");
      api.setCredentials(email, key);

      debug("Saving .netrc to disk");
      netrc.write();
    } catch(e) {
      return callback(e);
    }

    callback(null, { email: email, key: key });
  });
};

Credentials.prototype.getKey = function (callback) {
  if(!this.deployment) {
    return this._getLocalKey(callback);
  }

  return this._getDeploymentKey(callback);
};

Credentials.prototype._getDeploymentKey = function (callback) {
  var parsed = this.parseDeployment(),
      self = this;

  debug("Getting key for Spore pod from Deployment environment variable");

  this.api(function (err, api) {
    if(err) return callback(err);

    debug("Setting credentials in this instance of the api");
    api.setCredentials({ name: parsed.name, key: parsed.key });

    callback(null, { name: parsed.name, key: parsed.key });
  });
};

Credentials.prototype._getLocalKey = function (callback) {
  var self = this;

  debug("Getting key for Spore pod from local netrc file");

  async.parallel({
    host: function (next) {
      self.parseHost(next);
    },
    netrc: function (next) {
      self.netrc(next);
    },
    api: function (next) {
      self.api(next);
    }
  }, function (err, results) {
    if(err) return callback(err);

    var hostname = results.host.hostname,
        netrc = results.netrc,
        api = results.api,
        key,
        email;

    try {
      if(netrc.hasHost(hostname)) {
        debug(".netrc contains an entry for " + hostname + " - retrieving");

        key = netrc.host(hostname).password;
        email = netrc.host(hostname).login;
      } else {
        debug(".netrc contains no entry for " + hostname);
      }
    } catch(e) {
      return callback(e);
    }

    if(!key) return callback(null, false);
    if(!email) return callback(null, false);

    debug("Setting credentials in this instance of the api");

    api.setCredentials({ email: email, key: key });

    callback(null, { email: email, key: key });
  });
};
