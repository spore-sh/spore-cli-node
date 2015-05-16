var cellPathParse = require('spore-cell-parse'),
    fs = require('fs-extra'),
    touch = require('touch'),
    debug = require('debug')('spore-cli'),
    async = require('async');

module.exports = SporeSync;

function SporeSync() {}

SporeSync.prototype.sync = function (callback) {
  var self = this;

  this.emit('sync');

  this.syncApps(function (err) {
    if(err) return callback(err);

    self.syncCells(callback);
  });
};

SporeSync.prototype.syncApps = function (callback) {
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

SporeSync.prototype.syncAppFromLocalOnly = function (file, callback) {
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

SporeSync.prototype.syncCells = function (callback) {
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

SporeSync.prototype.syncCellFromLocalOnly = function (file, callback) {
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

SporeSync.prototype._offline = function () {
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

SporeSync.prototype._online = function () {
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
        this.emit('syncError', err);
        return;
      }
      this.emit('syncComplete');
    });
  });
};
