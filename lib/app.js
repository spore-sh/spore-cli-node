var uuid = require('node-uuid').v4,
    fs = require('fs-extra'),
    debug = require('debug')('spore-cli'),
    util = require('util'),
    jsonComment = require('./utils/json_comment'),
    SporeEnv = require('./env'),
    SporeAppPermissions = require('./app/permissions'),
    SporeAppRunner = require('./app/runner'),
    SporeAppGetSet = require('./app/get_set'),
    Errors = require('./errors'),
    lookupName = require('./utils/lookup'),
    resolvePath = require('./utils/resolve_path'),
    stringify = require('./utils/stringify');

module.exports = SporeApp;

function SporeApp(dir, spore) {
  SporeAppPermissions.call(this);
  SporeAppRunner.call(this);
  SporeAppGetSet.call(this);

  this.dir = dir;
  this.spore = spore;

  this.name = null;
  this.id = null;
  this.envs = [];

  debug("App initialized in " + this.dir);
}

util.inherits(SporeApp, SporeAppPermissions);
util.inherits(SporeApp, SporeAppRunner);
util.inherits(SporeApp, SporeAppGetSet);

SporeApp.Env = SporeEnv;

SporeApp.create = function (dir, name, spore, callback) {
  var SporeApp = this,
      app;

  app = new SporeApp(dir, spore);
  return app.create(name, callback);
};

SporeApp.load = function (dir, spore, callback) {
  var SporeApp = this,
      app;

  app = new SporeApp(dir, spore);
  return app.load(callback);
};

SporeApp.prototype.path = function () {
  return resolvePath(this.spore.appsPath(), this.id);
};

SporeApp.prototype.fullName = function () {
  return this.name;
};

SporeApp.prototype.api = function () {
  return this.spore.api.apply(this.spore, [].slice.call(arguments));
};

SporeApp.prototype.create = function (name, callback) {
  var self = this;

  if(arguments.length < 2) {
    callback = name;
    name = null;
  }

  debug("Making sure a spore app doesn't already exist in " + this.dir);
  this.load(function (err, app) {
    if(!err || !Errors.noAppFound.test(err)) {
      return callback(err || Errors.appExists.build(self.dir));
    }

    lookupName(self.dir, name, function (err, name) {
      if(err) return callback(err);

      self.spore.defaultEnvs(function (err, envNames) {

        self._create(name, envNames);

        self.save(callback);
      });
    });
  });

  return this;
};

SporeApp.prototype._create = function (name, envNames) {
  var self = this;

  this.name = name;
  this.id = uuid();

  if(envNames) {
    envNames.forEach(function (envName) {
      self.newEnv(envName);
    });
  }

  return this;
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

      json = jsonComment.strip(json);

      self._load(json);

      callback(null, self);
    });
  });

  return this;
};

SporeApp.prototype._load = function (json) {
  var self = this;

  this.name = json.name;
  this.id = json.id;

  Object.keys(json.envs || {}).forEach(function (envName) {
    self.newEnv(envName, json.envs[envName]);
  });
};

SporeApp.prototype.save = function (callback) {
  var self = this;

  this.spore.getConfig(['sporeFile', 'appFile'], function (err, sporeFile, appFile) {
    if(err) return callback(err);

    self.saveSporeFile(sporeFile, function (err) {
      if(err) return callback(err);

      self.saveAppFile(appFile, function (err) {
        if(err) return callback(err);
        callback(null, self);
      });
    });
  });

  return this;
};

SporeApp.prototype.saveSporeFile = function (sporeFile, callback) {
  var self = this,
      sporeFilePath = resolvePath(this.dir, sporeFile);

  debug("Saving " + sporeFile + " to " + this.dir);

  var contents;
  contents = self.sporeFileFormat();
  contents = jsonComment.write(contents, "This file was automatically generated using Spore (http://spore.sh)");
  contents = jsonComment.write(contents, "DO NOT EDIT BY HAND (unless resolving a merge conflict)");
  contents = jsonComment.write(contents, "Use the Spore command line tool to edit the contents of this file");

  fs.writeFile(sporeFilePath, stringify(contents), function (err) {
    if(err) return callback(err);

    callback(null, self);
  });
};

SporeApp.prototype.saveAppFile = function (appFile, callback) {
  var self = this,
      appPath = this.path(),
      appFilePath = resolvePath(appPath, appFile);

  debug("Ensuring app directory exists at " + appPath);

  fs.ensureDir(appPath, function (err) {
    if(err) return callback(err);

    debug("Saving " + appFile + " to " + appPath);

    fs.writeFile(appFilePath, stringify(self.appFileFormat()), function (err) {
      if(err) return callback(err);

      callback(null, self);
    });
  });
};

SporeApp.prototype.sporeFileFormat = SporeApp.prototype.toJSON = function () {
  envs = {};

  this.envs.forEach(function (env) {
    envs[env.name] = env.toJSON();
  });

  return {
    name: this.name,
    id: this.id,
    envs: envs
  };
};

SporeApp.prototype.appFileFormat = function () {
  return {
    name: this.name,
    id: this.id
  };
};

SporeApp.prototype.newEnv = function (envName, ids) {
  var env = new this.constructor.Env(this, envName, ids);
  this.envs.push(env);
  return env;
};

SporeApp.prototype.findEnv = function (envName) {
  var env;

  debug("Finding environment " + envName);

  for(var i=0; i<this.envs.length; i++) {
    if(this.envs[i].name === envName) {
      env = this.envs[i];
      break;
    }
  }

  if(!env) {
    debug("Environment " + envName + " does not exist");
    env = this.newEnv(envName);
  }

  return env;
};

