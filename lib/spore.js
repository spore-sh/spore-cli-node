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

Spore.prototype.sync = function (callback) {
  var self = this;

  this.api(function (err, api) {
    if(err) return callback(err);

    self.appsInCache(function (err, apps) {
      if(err) return callback(err);

      // TODO: save from local cache to server
      // var request = {};
      // apps.forEach(function (app) {
      //  merge(request, app.buildRequest());
      // });
      callback();
    });
  });
};

Spore.prototype.loadApp = function (dir, callback) {
  return this.constructor.App.load(dir, this, callback);
};

Spore.prototype.createApp = function (dir, name, callback) {
  return this.constructor.App.create(dir, name, this, callback);
};

Spore.prototype.appsInCache = function (callback) {
  var self = this;

  this.appFile(function (err, appFile) {
    if(err) return callback(err);

    fs.ensureDir(self.appsPath(), function (err) {
      if(err) return callback(err);

      subdirs(self.appsPath(), function (err, appDirs) {
        if(err) return callback(err);

        async.mapLimit(appDirs, 100, function (appDir, next) {
          self.constructor.App.loadFromAppFile(resolvePath(appDir, appFile), next);
        }, function (err, apps) {
          if(err) return callback(err);

          callback(null, apps);
        });
      });
    });
  });
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

Spore.prototype.grant = function (appId, envName, email, callback) {
  var self = this;

  this.api(function (err, api) {
    if(err) return callback(err);

    api.grant(appId, envName, email, callback);
  });
};

Spore.prototype.revoke = function (appId, envName, email, callback) {
  var self = this;

  this.api(function (err, api) {
    if(err) return callback(err);

    api.revoke(appId, envName, email, callback);
  });
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
