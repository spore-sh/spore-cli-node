var EnvyApi = require('envy-api'),
    netrc = require('netrc-rw');

module.exports = Envy;

function Envy(options) {
  this.api = new EnvyApi(options);
}

Envy.prototype.signup = function (email, password, callback) {
  var self = this;
  this.api.signup(email, password, function (err, user) {
    if(err) return callback(err);
    
    try {
      self._setKey(user.email, user.key);
    } catch(e) {
      return callback(e);
    }

    callback(null, user);
  });
};

Envy.prototype.login = function (email, password, callback) {
  var self = this;
  this.api.login(email, password, function (err, user) {
    if(err) return callback(err);
    
    try {
      self._setKey(user.email, user.key);
    } catch(e) {
      return callback(e);
    }

    callback(null, user);
  });
};

Envy.prototype.listApps = function (callback) {
  this.api.listApps(callback);
};

Envy.prototype._setKey = function (email, key) {
  if(!key) throw new Error("Key can't be blank.");

  netrc.read();

  if(!netrc.machines[this.host]) {
    netrc.addMachine(this.host, {});
  }

  netrc.host(this.host).login = email;
  netrc.host(this.host).password = key;

  this.api.setKey(key);

  netrc.write();
};

Envy.prototype.getKey = function () {
  var key;

  try {
    key = netrc.host(this.host).password;

    this.api.setKey(key);
  } catch(e) {
    return false;
  }

  return key;
};
