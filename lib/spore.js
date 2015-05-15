var SporeApi = require('spore-api'),
    SporeConfig = require('./spore/config'),
    SporeApp = require('./app'),
    mixin = require('./utils/mixin'),
    Errors = require('spore-errors'),
    cellPathParse = require('spore-cell-parse'),
    path = require('path'),
    fs = require('fs-extra'),
    touch = require('touch'),
    netrc = require('netrc-rw'),
    debug = require('debug')('spore-cli'),
    async = require('async'),
    EventEmitter = require('events').EventEmitter;

module.exports = Spore;

function Spore() {
  mixin(this, EventEmitter);
  mixin(this, SporeConfig);
  this.apiKey = null;
}

Spore.App = SporeApp;

Spore.prototype.loadApp = function (dir, callback) {
  return this.constructor.App.load(dir, this, callback);
};

Spore.prototype.createApp = function (dir, name, callback) {
  return this.constructor.App.create(dir, name, this, callback);
};

Spore.prototype.sync = function (callback) {
  var self = this;

  this.emit('sync');

  this.syncApps(function (err) {
    if(err) return callback(err);

    self.syncCells(callback);
  });
};

Spore.prototype.syncApps = function (callback) {
  var spore = this;

  debug("Checking for non-saved apps in " + spore.localOnlyAppsPath());

  fs.readdir(spore.localOnlyAppsPath(), function (err, files) {
    if(err && err.code === 'ENOENT') {
      debug(spore.localOnlyAppsPath() + " doesn't exist, so no apps to sync!");
      return callback();
    }
    if(err) return callback(err);

    async.eachLimit(files, 100, function (file, next) {
      spore.syncFromLocalOnly(file, next);
    }, callback);
  });
};

Spore.prototype.syncAppFromLocalOnly = function (file, callback) {
  var spore = this;

  debug("Loading " + file + " as local only app");

  fs.readJson(file, function (err, json) {
    if(err) return callback(err);

    var app = new SporeApp(null, spore);

    app._load(json);

    app._saveRemote(callback);
  });
};

Spore.prototype.syncCells = function (callback) {
  var spore = this;

  debug("Checking for non-saved cells in " + spore.localOnlyCellsPath());

  fs.readdir(spore.localOnlyCellsPath(), function (err, files) {
    if(err && err.code === 'ENOENT') {
      debug(spore.localOnlyCellsPath() + " doesn't exist, so no cells to sync!");
      return callback();
    }
    if(err) return callback(err);

    async.eachLimit(files, 100, function (file, next) {
      spore.syncCellFromLocalOnly(file, next);
    }, callback);
  });
};

Spore.prototype.syncCellFromLocalOnly = function (file, callback) {
  var spore = this;

  debug("Loading " + file + " as local only cell");

  fs.readJson(file, function (err, json) {
    if(err) return callback(err);

    var remotePath = json.remote,
        fullName = json.name,
        parsedRemote = cellPathParse(remotePath),
        parsedName = cellPathParse(fullName),
        appId = parsedRemote.app,
        envName = parsedRemote.env,
        appName = parsedName.app,
        app,
        cell;

    app = new SporeApp(null, spore);
    app.id = appId;
    app.name = appName;

    cell = app.findEnv(envName).findCell(json.key);

    cell.id = json.id;
    cell.value(json.value);

    cell._remoteSaveLocal(callback);
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

    self._api.use(function (err) {
      if(err && Errors.noConnection.test(err)) {
        self._offline();
      }
      if(!err) {
        self._online();
      }
    });

    callback(null, self._api);
  });

  return this;
};

Spore.prototype._offline = function () {
  debug("API has gone offline");

  touch(this.offlinePath(), function (err) {
    if(err) {
      debug("Error encountered while setting offline flag");
      debug(err);
      return;
    }

    debug("Offline flag has been set");
  });
};

Spore.prototype._online = function () {
  var self = this;

  debug("API is back online");

  fs.unlink(this.offlinePath(), function (err) {
    if(err && err.code === 'ENOENT') {
      debug("Offline flag was not previously set");
      return;
    }
    if(err) {
      debug("Error encountered while removing offline flag");
      debug(err);
      return;
    }

    self.sync(function (err) {
      if(err) {
        debug("Error encountered while syncing after coming back online");
        debug(err);
        this.emit('syncError', err);
        return;
      }
      this.emit('syncComplete');
    });
  });
};

Spore.prototype.signup = function (email, password, callback) {
  var self = this;

  debug("Signing up for Spore pod");

  this.api(function (err, api) {
    if(err) return callback(err);

    api.signup(email, password, function (err, user) {
      if(err) return callback(err);

      debug("Sign up successful, saving credentials to netrc");

      self.setKey(user.email, user.key, callback);
    });
  });
};

Spore.prototype.login = function (email, password, callback) {
  var self = this;

  debug("Logging into Spore pod");

  this.api(function (err, api) {
    if(err) return callback(err);

    api.login(email, password, function (err, key) {
      if(err) return callback(err);

      debug("Log in successful, saving credentials to netrc");

      self.setKey(email, key, callback);
    });
  });
};

Spore.prototype.setKey = function (email, key, callback) {
  var self = this;

  async.parallel({
    host: function (next) {
      self.parseHost(next);
    },
    api: function (next) {
      self.api(next);
    }
  }, function (err, config) {
    if(!err && !key) err = new Error("Key can't be blank.");
    if(!err && !email) err = new Error("Email can't be blank.");
    if(err) return callback(err);

    try {
      if(!netrc.hasHost(config.host.hostname)) {
        netrc.addMachine(config.host.hostname);
      }

      netrc.host(config.host.hostname).login = email;
      netrc.host(config.host.hostname).password = key;

      config.api.setCredentials(email, key);

      netrc.write();
    } catch(e) {
      return callback(e);
    }

    callback(null, { email: email, key: key });
  });
};

Spore.prototype.getKey = function (callback) {
  var self = this;

  async.parallel({
    host: function (next) {
      self.parseHost(next);
    },
    api: function (next) {
      self.api(next);
    }
  }, function (err, config) {
    if(err) return callback(err);

    var key,
        email;

    try {
      if(netrc.hasHost(config.host.hostname)) {
        key = netrc.host(config.host.hostname).password;
        email = netrc.host(config.host.hostname).email;
      }
    } catch(e) {
      return callback(e);
    }

    if(!key) return callback(null, false);
    if(!email) return callback(null, false);

    config.api.setCredentials(email, key);

    callback(null, { email: email, key: key });
  });
};
