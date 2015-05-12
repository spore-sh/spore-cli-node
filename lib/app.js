var uuid = require('node-uuid').v4,
    fs = require('fs-extra'),
    debug = require('debug')('spore-cli'),
    util = require('util'),
    spawn = require('child_process').spawn,
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
  var self = this;

  this.name = json.name;
  this.id = json.id;

  Object.keys(json.envs || {}).forEach(function (envName) {
    self.envs.push(new self.constructor.Env(envName, json.envs[envName]));
  });

  this._loaded = true;
};

SporeApp.prototype.save = function (err) {
  var self = this;

  this.spore.sporeFile(function (err, sporeFile) {
    if(err) return callback(err);

    var sporeFilePath = resolvePath(self.dir, sporeFile);

    fs.writeFile(sporeFilePath, stringify(self.toJSON()), function (err) {
      if(err) return callback(err);

      self._loaded = true;

      callback(null, self);
    });
  });

  return this;
};

SporeApp.prototype.toJSON = function () {
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

SporeApp.prototype.loadCell = function (env, cell, callback) {
  return this.spore.loadCell(this, env, cell, callback);
};

SporeApp.prototype.saveCell = function (env, cell, callback) {
  return this.spore.saveCell(this, env, cell, callback);
};

SporeApp.prototype.run = function (cmds, envName, callback) {
  if(!this._loaded) {
    return callback(Errors.notLoaded.build(this.name));
  }

  var env;

  for(var i=0; i<this.envs.length; i++) {
    if(this.envs[i].name === envName) {
      env = this.envs[i];
      break;
    }
  }

  if(!env) {
    env = new this.constructor.Env(this, envName);
  }

  env.values(function (err, envValues) {
    if(err) return callback(err);

    // use the current environment for defaults
    for(var p in process.env) {
      if(env[p] === undefined) {
        env[p] = process.env[p];
      }
    }

    var cmd = cmds.shift(),
        args = cmds,
        child;

    debug("Spawning " + cmd + " with arguments: " + args.join(', '));
    child = spawn(cmd, args, { env: env });

    callback(null, child);
  });
};
