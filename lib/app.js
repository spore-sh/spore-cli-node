var uuid = require('node-uuid').v4,
    fs = require('fs-extra'),
    debug = require('debug')('spore-cli'),
    async = require('async'),
    spawn = require('child_process').spawn,
    Errors = require('spore-errors'),
    lookupName = require('./utils/lookup'),
    resolvePath = require('./utils/resolve_path'),
    stringify = require('./utils/stringify'),
    jsonComment = require('json-comment'),
    permissions = require('./app/permissions'),
    Env = require('./env'),
    App = require('spore').App;

module.exports = App;

// mixin permissions methods
Object.keys(permissions).forEach(function (methodName) {
  App.prototype[methodName] = permissions[methodName];
});

App.Env = Env;

App.create = function (dir, name, spore, callback) {
  var App = this,
      app;

  app = new App(dir, spore);
  return app.create(name, callback);
};

App.prototype.create = function (name, callback) {
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

      self._create(name, self.spore.config.defaultEnvs());

      self.saveRemote(function (err) {
        if(err) return callback(err);

        self.save(callback);
      });
    });
  });

  return this;
};

App.prototype._create = function (name, envNames) {
  var self = this,
      appEnv = self.spore.config.appEnv();

  this.name = name;
  this.id = uuid();

  if(envNames) {
    envNames.forEach(function (envName) {
      var env = self.newEnv(envName);
      env.set(appEnv, envName);
    });
  }

  return this;
};

App.prototype.save = function (callback) {
  var self = this;

  if(this.isDeployment()) {
    debug("Spore is running in a deployment, not saving");

    process.nextTick(function () {
      callback(null, self);
    });

    return;
  }

  this.saveSporeFile(callback);

  return this;
};

App.prototype.saveSporeFile = function (callback) {
  var self = this,
      sporeFilePath = resolvePath(this.dir, this.spore.config.sporeFile());

  debug("Saving " + this.spore.config.sporeFile() + " to " + this.dir);

  var contents;
  contents = this.sporeFileFormat();
  contents = jsonComment.write(contents, "This file was automatically generated using Spore (http://spore.sh)");
  contents = jsonComment.write(contents, "DO NOT EDIT BY HAND (unless resolving a merge conflict)");
  contents = jsonComment.write(contents, "Use the Spore command line tool to edit the contents of this file");

  fs.writeFile(sporeFilePath, stringify(contents), function (err) {
    if(err) return callback(err);

    callback(null, self);
  });
};

App.prototype.saveRemote = function (callback) {
  debug("Saving " + this.fullName() + " to the remote");

  this.api().apps.create(this.remotePath(), this.remoteFormat(), callback);
};

App.prototype.sporeFileFormat = App.prototype.toJSON = function () {
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

App.prototype.remoteFormat = function () {
  return {
    name: this.name
  };
};

App.prototype.set = function (envName, key, value, callback) {
  var self = this,
      env = this.findEnv(envName);

  env.set(key, value, function (err) {
    if(err) return callback(err);

    self.save(callback);
  });
};

App.prototype.setAll = function (key, value, callback) {
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

App.prototype.run = function (cmds, envName, callback) {
  debug("Running " + cmds[0] + " on " + this.fullName() + "/" + envName);

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

