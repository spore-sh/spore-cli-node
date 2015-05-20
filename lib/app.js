var uuid = require('node-uuid').v4,
    fs = require('fs-extra'),
    debug = require('debug')('spore-cli'),
    Permissions = require('./app/permissions'),
    Runner = require('./app/runner'),
    GetSet = require('./app/get_set'),
    Errors = require('spore-errors'),
    lookupName = require('./utils/lookup'),
    resolvePath = require('./utils/resolve_path'),
    stringify = require('./utils/stringify'),
    jsonComment = require('./utils/json_comment'),
    Env = require('./env'),
    App = require('spore').App;

module.exports = App;

[Permissions, Runner].forEach(function (ctor) {
  Object.keys(ctor.prototype).forEach(function (methodName) {
    App.prototype[methodName] = ctor.prototype[methodName];
  });
});

App.GetSet = GetSet;
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

      self.spore.defaultEnvs(function (err, envNames) {

        self._create(name, envNames);

        self.save(function (err) {
          if(err) return callback(err);

          self.saveRemote(callback);
        });
      });
    });
  });

  return this;
};

App.prototype._create = function (name, envNames) {
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
  var self = this;

  this.spore.sporeFile(function (err, sporeFile) {
    var sporeFilePath = resolvePath(self.dir, sporeFile);

    debug("Saving " + sporeFile + " to " + self.dir);

    var contents;
    contents = self.sporeFileFormat();
    contents = jsonComment.write(contents, "This file was automatically generated using Spore (http://spore.sh)");
    contents = jsonComment.write(contents, "DO NOT EDIT BY HAND (unless resolving a merge conflict)");
    contents = jsonComment.write(contents, "Use the Spore command line tool to edit the contents of this file");

    fs.writeFile(sporeFilePath, stringify(contents), function (err) {
      if(err) return callback(err);

      callback(null, self);
    });
  });
};

App.prototype.saveRemote = function (callback) {
  var self = this;

  this.api(function (err, api) {
    if(err) return callback(err);

    debug("Saving " + self.fullName() + " to the remote");

    api.apps.create(self.remotePath(), self.remoteFormat(), callback);
  });
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

