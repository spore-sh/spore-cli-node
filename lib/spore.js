var SporeApi = require('spore-api'),
    path = require('path'),
    fs = require('fs-extra'),
    netrc = require('netrc-rw'),
    debug = require('debug')('spore-cli'),
    defaultConfig = require('./default_config.json');

module.exports = Spore;

function Spore() {
  this.configDir = process.env.SPORE_HOME || '~/.spore';
  this.configFile = 'config.json';
  this._config = null;
  this.defaultConfig = defaultConfig;
}

Spore.prototype.configPath = function () {
  return resolvePath(this.configDir, this.configFile);
};

Spore.prototype.host = function (host, callback) {
  if(arguments.length < 2) {
    callback = host;
    return this.getConfig('host', callback);
  }

  this.setConfig('host', host, callback);
};

Spore.prototype.sporeFile = function (filename, callback) {
  if(arguments.length < 2) {
    callback = filename;
    return this.getConfig('sporeFile', callback);
  }

  this.setConfig('sporeFile', filename, callback);
};

Spore.prototype.defaultEnv = function (envName, callback) {
  if(arguments.length < 2) {
    callback = envName;
    return this.getConfig('defaultEnv', callback);
  }

  this.setConfig('defaultEnv', envName, callback);
};


Spore.prototype.getConfig = function (key, callback) {
  var self = this;

  if(!this._config) {
    debug("Config not yet initialized");

    this._getConfig(function (err) {
      if(err) return callback(err);

      callback(null, self._config[key]);
    });

    return;
  }

  process.nextTick(function () {
    callback(null, self._config[key]);
  });
};

// Get the current spore configuration, or create a config file
// with the default configuration if no config file exists
Spore.prototype._getConfig = function (callback) {
  var self = this;

  debug("Reading config file at " + this.configPath);

  fs.readFile(this.configPath, { encoding: 'utf8' }, function (err, raw) {
    if(err && err.code === 'ENOENT') {

      debug("No config file found, creating one.");

      fs.ensureDir(path.dirname(self.configPath), function (err) {
        if(err) return callback(err);

        fs.writeFile(self.configPath, stringify(self.defaultConfig), function (err) {
          if(err) return callback(err);

          debug("Default config written to " + self.configPath);

          self.getConfig(callback);
        });
      });

      return;
    }

    var json;

    if(err) return callback(err);

    debug("Parsing config file");

    try {
      json = JSON.parse(raw);
    } catch(e) {
      return callback(e);
    }

    self._config = json;

    callback(null, self);
  });
};

Spore.prototype.setConfig = function (key, value, callback) {
  var self = this;

  if(!this._config) {
    debug("Config not yet initialized");

    this._getConfig(function (err) {
      if(err) return callback(err);
      self._setConfig(key, value, callback);
    });

    return;
  }

  process.nextTick(function () {
    self._setConfig(key, value, callback);
  });
};

Spore.prototype._setConfig = function (key, value, callback) {
  var self = this;

  this._config[key] = value;

  debug("Writing to config file at " + this.configPath);

  fs.writeFile(this.configPath, stringify(this._config), function (err) {
    if(err) return callback(err);

    callback(null, self._config);
  });
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

Spore.prototype.lookupName = function (dir) {
  // check for node.js package name
  try {
    return require(path.join(dir, "package.json")).name;
  } catch(e) {
    // not a valid node application
  }
  
  // check for Rails application
  // TODO
  
  // fallback on directory name
  return path.basename(dir);
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

function resolvePath(str) {
  if (str.substr(0, 2) === '~/') {
    str = (process.env.HOME || process.env.HOMEPATH || process.env.HOMEDIR || process.cwd()) + str.substr(1);
  }
  return path.resolve(str);
}

function stringify(json) {
  return JSON.stringify(json, null, 2);p
}
