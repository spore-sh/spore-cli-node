var cellPathParse = require('spore-cell-parse'),
    fs = require('fs-extra'),
    touch = require('touch'),
    debug = require('debug')('spore-cli'),
    async = require('async');

module.exports = Sync;

function Sync() {
  var self = this;

  this.on('api:offline', function () {
    self._offline();
  });

  this.on('api:online', function () {
    self._online();
  });
}

Sync.prototype.sync = function (callback) {
  var self = this;

  this.emit('sync:start');

  this.syncApps(function (err) {
    if(err) return callback(err);

    self.syncCells(callback);
  });
};

Sync.prototype.syncApps = function (callback) {
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

Sync.prototype.syncAppFromLocalOnly = function (file, callback) {
  var spore = this,
      SporeApp = this.constructor.App;

  debug("Loading " + file + " as local only app");

  fs.readJson(file, function (err, json) {
    if(err) return callback(err);

    var app = new SporeApp(null, spore);

    app._load(json);

    app._saveRemote(callback);
  });
};

Sync.prototype.syncCells = function (callback) {
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

Sync.prototype.syncCellFromLocalOnly = function (file, callback) {
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

Sync.prototype._offline = function () {
  debug("API id offline");

  touch(this.offlinePath(), function (err) {
    if(err) {
      debug("Error encountered while setting offline flag");
      debug(err);
      return;
    }

    debug("Offline flag has been set");
  });
};

Sync.prototype._online = function () {
  var self = this;

  debug("API is online");

  fs.unlink(this.offlinePath(), function (err) {
    if(err && err.code === 'ENOENT') {
      debug("Offline flag was not previously set, assuming we were previously connected");
      return;
    }
    if(err) {
      debug("Error encountered while removing offline flag");
      debug(err);
      return;
    }

    debug("API back online after a dark period");

    self.sync(function (err) {
      if(err) {
        debug("Error encountered while syncing after coming back online");
        debug(err);
        this.emit('sync:error', err);
        return;
      }
      this.emit('sync:complete');
    });
  });
};
