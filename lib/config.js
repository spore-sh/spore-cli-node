var path = require('path'),
    url = require('url'),
    resolvePath = require('utils/resolve_path'),
    stringify = require('utils/stringify'),
    fs = require('fs-extra'),
    debug = require('debug')('spore-cli'),
    defaultConfig = require('./default_config.json');

module.exports = SporeConfig;

function SporeConfig() {
  this.homeDir = process.env.SPORE_HOME || '~/.spore';
  this.configFile = 'config.json';
  this._config = null;
  this.defaultConfig = defaultConfig;
}

SporeConfig.prototype.configPath = function () {
  return resolvePath(this.homeDir, this.configFile);
};

SporeConfig.prototype.host = function (host, callback) {
  if(arguments.length < 2) {
    callback = host;
    return this.getConfig('host', callback);
  }

  this.setConfig('host', host, callback);
};

SporeConfig.prototype.parseHost = function (callback) {
  this.host(function (err, host) {
    if(err) return callback(err);
    callback(null, url.parse(host));
  });
};

SporeConfig.prototype.sporeFile = function (filename, callback) {
  if(arguments.length < 2) {
    callback = filename;
    return this.getConfig('sporeFile', callback);
  }

  this.setConfig('sporeFile', filename, callback);
};

SporeConfig.prototype.defaultEnv = function (envName, callback) {
  if(arguments.length < 2) {
    callback = envName;
    return this.getConfig('defaultEnv', callback);
  }

  this.setConfig('defaultEnv', envName, callback);
};


SporeConfig.prototype.getConfig = function (key, callback) {
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
SporeConfig.prototype._getConfig = function (callback) {
  var self = this;

  debug("Reading config file at " + this.configPath);

  fs.readJson(this.configPath, { encoding: 'utf8' }, function (err, json) {
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

    if(err) return callback(err);

    self._config = json;

    callback(null, self);
  });
};

SporeConfig.prototype.setConfig = function (key, value, callback) {
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

SporeConfig.prototype._setConfig = function (key, value, callback) {
  var self = this;

  this._config[key] = value;

  debug("Writing to config file at " + this.configPath);

  fs.writeFile(this.configPath, stringify(this._config), function (err) {
    if(err) return callback(err);

    callback(null, self._config);
  });
};
