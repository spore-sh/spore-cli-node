var SporeApi = require('spore-api'),
    SporeConfig = require('./config'),
    SporeApp = require('./app'),
    Errors = require('./errors'),
    resolvePath = require('./utils/resolve_path'),
    subdirs = require('./utils/subdirs'),
    util = require('util'),
    path = require('path'),
    fs = require('fs-extra'),
    netrc = require('netrc-rw'),
    debug = require('debug')('spore-cli'),
    async = require('async');

module.exports = Spore;

function Spore() {
  SporeConfig.call(this);
}

util.inherits(Spore, SporeConfig);

Spore.App = SporeApp;

Spore.prototype.loadApp = function (dir, callback) {
  return this.constructor.App.load(dir, this, callback);
};

Spore.prototype.createApp = function (dir, name, callback) {
  return this.constructor.App.create(dir, name, this, callback);
};

Spore.prototype.api = function (callback) {
  var self = this;

  if(this._api) {
    process.nextTick(function () {
      callback(null, self._api);
    });
    return this;
  }

  this.parseHost(function (err, options) {
    if(err) return callback(err);

    self._api = new SporeApi(options);

    callback(null, self._api);
  });

  return this;
};

Spore.prototype.signup = function (email, password, callback) {
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

Spore.prototype.login = function (email, password, callback) {
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

Spore.prototype._setKey = function (email, key) {
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

Spore.prototype.getKey = function () {
  var key;

  try {
    key = netrc.host(this.host).password;

    this.api.setKey(key);
  } catch(e) {
    return false;
  }

  return key;
};
