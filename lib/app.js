var uuid = require('node-uuid').v4,
    fs = require('fs-extra'),
    debug = require('debug')('spore-cli'),
    util = require('util'),
    Errors = require('./errors'),
    lookupName = require('./utils/lookup'),
    resolvePath = require('./utils/resolve_path'),
    stringify = require('./utils/stringify');

module.exports = SporeApp;

function SporeApp(dir, spore, options) {
  this.dir = options.dir;
  this.spore = spore;

  this.name = null;
  this.id = null;
  this.envs = {};
}

SporeApp.create = function (dir, spore, callback) {
  var SporeApp = this,
      app;

  app = new SporeApp(dir, spore);
  return app.create(callback);
};

SporeApp.prototype.create = function (callback) {
  var self = this;

  debug("Making sure a spore app doesn't already exist in " + dir);
  this.load(self.dir, function (err, app) {
    if(!err || !Errors.noAppFound.test(err)) {
      return callback(err || Errors.appExists.build(self.dir));
    }

    lookupName(self.dir, function (err, name) {
      if(err) return callback(err);

      self._create(name);

      self.save(callback);
    });
  });

  return this;
};

SporeApp.prototype._create = function (name) {
  this.name = name;
  this.id = uuid();
};

SporeApp.prototype.load = function (callback) {
  var self = this;

  this.spore.sporeFile(function (err, sporeFile) {
    if(err) return callback(err);

    var sporeFilePath = resolvePath(self.dir, sporeFile);

    debug("Loading sporeFile at " + sporeFilePath);
    fs.readJson(sporeFilePath, { encoding: 'utf8' }, function (err, json) {
      if(err && err.code === 'ENOENT') {
        return callback(Errors.noAppFound.build(sporeFile, self.dir));
      }
      if(err) return callback(err);

      self._load(json);

      callback(null, self);
    });
  });

  return this;
};

SporeApp.prototype._load = function (json) {
  this.name = json.name;
  this.id = json.id;
  this.envs = json.envs;
};

SporeApp.prototype.save = function (err) {
  var self = this;

  this.spore.sporeFile(function (err, sporeFile) {
    if(err) return callback(err);

    var sporeFilePath = resolvePath(self.dir, sporeFile);

    fs.writeFile(sporeFilePath, stringify(self.toJSON()), function (err) {
      if(err) return callback(err);

      callback(null, self);
    });
  });

  return this;
};

SporeApp.prototype.toJSON = function () {
  return {
    name: this.name,
    id: this.id,
    envs: this.envs
  };
};
