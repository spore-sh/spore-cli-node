var uuid = require('node-uuid').v4,
    fs = require('fs-extra'),
    debug = require('debug')('spore-cli'),
    util = require('util'),
    spawn = require('child_process').spawn,
    async = require('async'),
    merge = require('merge'),
    jsonComment = require('./utils/json_comment'),
    SporeEnv = require('./env'),
    Errors = require('./errors'),
    lookupName = require('./utils/lookup'),
    resolvePath = require('./utils/resolve_path'),
    stringify = require('./utils/stringify');

module.exports = SporeApp;

function SporeApp(dir, spore) {
  this.dir = dir;
  this.spore = spore;

  this.name = null;
  this.id = null;
  this.envs = [];
  this._loaded = null;

  debug("App initialized in " + this.dir);
}

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

SporeApp.loadFromAppFile = function (spore, appFilePath, callback) {
  var SporeApp = this;

  fs.readJson(appFilePath, function (err, json) {
    if(err) return callback(err);

    var app;

    app = new SporeApp(null, spore);
    app.id = json.id;
    app.name = json.name;

    callback(null, app);
  });
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

  this._loaded = true;
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

    self._loaded = true;

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

SporeApp.prototype.path = function () {
  return resolvePath(this.spore.appsPath(), this.id);
};

SporeApp.prototype.fullName = function () {
  return this.name;
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

SporeApp.prototype.set = function (envName, key, value, callback) {
  var self = this,
      env = this.findEnv(envName);

  env.set(key, value, function (err) {
    if(err) return callback(err);

    self.save(callback);
  });
};

SporeApp.prototype.setAll = function (key, value, callback) {
  var self = this;

  debug("Setting " + key + " for all environments of " + this.fullName());

  if(!this.envs.length) {
    return callback(Errors.noEnvs.build(this.fullName()));
  }

  async.each(this.envs, function (env, next) {

    env.set(key, value, next);

  }, function (err) {
    if(err) return callback(err);

    self.save(callback);
  });
};

SporeApp.prototype.get = function (envName, key, callback) {
  var env = this.findEnv(envName);

  if(arguments.length < 3) {
    callback = key;

    return env.getAll(callback);
  }

  env.get(key, callback);
};

SporeApp.prototype.getAll = function (key, callback) {
  var self = this,
      allKeys = false;

  if(arguments.length < 2) {
    allKeys = true;
    callback = key;
    key = null;
  }

  debug("Getting " + (allKeys ? "all keys" : key) + " for all environments of " + this.fullName());

  if(!this.envs.length) {
    debug("No environments on " + this.fullName() + " to retrieve values from");
    return callback(null, {});
  }

  async.map(this.envs, function (env, next) {

    var args = [env.name];

    if(!allKeys) {
      args.push(key);
    }

    args.push(function (err, kv) {
      if(err) return next(err);

      envValue = {};
      envValue[env.name] = kv;

      callback(null, envValue);
    });

    self.get.apply(self, args);

  }, function (err, envValues) {
    if(err) return callback(err);

    callback(null, merge.apply(null, envValues));
  });
};

SporeApp.prototype.run = function (cmds, envName, callback) {
  debug("Running " + cmds[0] + " on " + this.fullName() + "/" + envName);

  if(!this._loaded) {
    return callback(Errors.notLoaded.build(this.fullName()));
  }

  this.get(envName, function (err, envValues) {
    if(err) return callback(err);

    // use the current environment for defaults
    for(var p in process.env) {
      if(envValues[p] === undefined) {
        envValues[p] = process.env[p];
      }
    }

    var cmd = cmds.shift(),
        args = cmds,
        child;

    debug("Spawning " + cmd + " with arguments: " + args.join(', '));
    child = spawn(cmd, args, { env: envValues });

    callback(null, child);
  });
};

SporeApp.prototype.grant = function (envName, email, callback) {
  var self = this,
      env = this.findEnv(envName);

  debug("Granting read permission to " + email + " for " + env.fullName());

  debug("Saving " + this.fullName() + " before granting");

  this.save(function (err) {
    if(err) return callback(err);

    env.grant(email, callback);
  });
};

SporeApp.prototype.grantAll = function (email, callback) {
  var self = this;

  debug("Granting read permission to " + email + " for all environments");

  async.each(this.envs, function (env, next) {
    env.grant(email, next);
  }, callback);
};

SporeApp.prototype.revoke = function (envName, email, callback) {
  var self = this,
      env = this.findEnv(envName);

  debug("Revoking read permission from " + email + " for " + env.fullName());

  debug("Saving " + this.fullName() + " before revoking");

  this.save(function (err) {
    if(err) return callback(err);

    env.revoke(email, callback);
  });
};

SporeApp.prototype.revokeAll = function (email, callback) {
  var self = this;

  debug("Revoking read permissions from " + email + " for all environments");

  async.each(this.envs, function (env, next) {
    env.revoke(email, next);
  }, callback);
};

SporeApp.prototype.users = function (envName, callback) {
  var self = this;
      env = this.findEnv(envName);

  debug("Listing users with read permissions for " + env.fullName());

  debug("Saving " + this.fullName() + " before checking permissions");

  this.save(function (err) {
    if(err) return callback(err);

    env.users(callback);
  });
};

SporeApp.prototype.allUsers = function (callback) {
  var self = this;

  debug("Listing users with read permissions for all environments on " + this.fullName());

  async.map(this.envs, function (env, next) {
    env.users(next);
  }, function (err, users) {
    if(err) return callback(err);

    var allUsers = [];

    users.forEach(function (envUsers) {
      allUsers = allUsers.concat(envUsers);
    });

    callback(null, allUsers);
  });
};

