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

Spore.prototype.loadCell = function (app, env, cell, callback) {
  var envPath = this.envPath(app.id, env.name),
      cellPath = this.cellPath(app.id, env.name, cell.id);

  fs.ensureDir(envPath, function (err) {
    if(err) return callback(err);

    fs.readFile(cellPath, function (err, val) {
      if(err && err.code === 'ENOENT') {
        // TODO: load from server
        err = Errors.noCache.build(app.name, env.name, cell.key);
        return callback(err);
      }
      if(err) return callback(err);

      callback(null, val);
    });
  });
};

Spore.prototype.saveCell = function (app, env, cell, callback) {
  var envPath = this.envPath(app.id, env.name),
      cellPath = this.cellPath(app.id, env.name, cell.id);

  fs.ensureDir(envPath, function (err) {
    if(err) return callback(err);

    fs.writeFile(cellPath, { flags: 'wx' }, function (err) {
      if(err) return callback(err);

      // TODO: write to server
      
      callback();
    });
  });
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

Spore.prototype.getAppAndEnv = function(dir, appName, envName, callback) {
  var spore = this;

  if(appName && envName) {
    return callback(null, appName, envName);
  }

  spore.readDotSpore(dir, function (err, env) {
    if(err) return callback(err);

    appName = appName || env[spore.appNameVar] || spore.lookupName(dir);
    envName = envName || env[spore.envNameVar] || spore.defaultEnv;

    callback(null, appName, envName);
  });
};

Spore.prototype.readDotSpore = function (dir, callback) {
  var spore = this;

  fs.readFile(path.join(dir, this.dotSpore), { encoding: 'utf8' }, function (err, contents) {
    var env = {};

    if(err && err.code === 'ENOENT') {
      // dot spore does not exist, so send back
      // an empty assignment
      return callback(null, env);
    }

    if(err) return callback(err);

    try {
      spore.readDotSporeContents(contents);
    } catch(e) {
      return callback(e);
    }

    callback(null, env);
  });
};

Spore.prototype.readDotSporeContents = function (contents) {
  var env = {};

  contents.split("\n").forEach(function (line, i) {

    // remove comments
    if(line.indexOf('#') > -1) {
      line = line.substring(0, line.indexOf('#'));
    }

    // skip blank lines
    if(line === "") {
      return;
    }

    var key,
        value;

    if(line.indexOf('=') === -1) {
      throw new Error("Invalid assignment on line " + i + 1 + ". " + line + " does not contain an `=`.");
    }

    key = line.substring(0, line.indexOf('='));
    value = line.substring(line.indexOf('=') + 1);

    env[key] = value;
  });

  return env;
};

Spore.prototype.writeDotSpore = function (appName, envName, dir, callback) {
  if(arguments.length < 4) {
    callback = dir;
    dir = envName;
    envName = this.defaultEnv;
  }

  var dotSpore = this.dotSpore;

  this.api.getDotSpore(appName, envName, function (err, contents) {
    if(err) return callback(err);

    fs.writeFile(path.join(dir, dotSpore), contents, callback);
  });
};

Spore.prototype.getDotSpore = function (appName, envName, callback) {
  var spore = this;

  if(arguments.length < 3) {
    callback = envName;
    envName = this.defaultEnv;
  }

  this.api.getDotSpore(appName, envName, function (err, contents) {
    if(err) return callback(err);

    try {
      contents = spore.readDotSporeContents(contents);
    } catch(e) {
      return callback(e);
    }

    callback(null, contents);
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
