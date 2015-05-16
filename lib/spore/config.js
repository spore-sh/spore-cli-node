var path = require('path'),
    url = require('url'),
    fs = require('fs-extra'),
    netrc = require('netrc-rw'),
    debug = require('debug')('spore-cli'),
    SporeApi = require('spore-api'),
    Errors = require('spore-errors'),
    resolvePath = require('../utils/resolve_path'),
    stringify = require('../utils/stringify'),
    defaultConfig = require('./default_config.json');

module.exports = SporeConfig;

function SporeConfig() {
  this.homeDir = process.env.SPORE_HOME || '~/.spore';
  this.configFile = 'config.json';
  this._config = null;
  this.defaultConfig = defaultConfig;
}

SporeConfig.prototype.configPath = function () {
  return resolvePath(this.sporePath(), this.configFile);
};

SporeConfig.prototype.appsPath = function () {
  return resolvePath(this.sporePath(), 'apps');
};

SporeConfig.prototype.localOnlyCellsPath = function () {
  return resolvePath(this.localOnlyPath(), 'cells');
};

SporeConfig.prototype.localOnlyAppsPath = function () {
  return resolvePath(this.localOnlyPath(), 'apps');
};

SporeConfig.prototype.localOnlyPath = function () {
  return resolvePath(this.sporePath(), '.local');
};

SporeConfig.prototype.offlinePath = function () {
  return resolvePath(this.sporePath(), '.offline');
};

SporeConfig.prototype.sporePath = function () {
  return resolvePath(this.homeDir);
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

    var parsed = url.parse(host);

    // for some reason `url.parse` includes the final `:`
    // in the protocol
    parsed.protocol = parsed.protocol.slice(0, -1 * ':'.length);

    callback(null, parsed);
  });
};

SporeConfig.prototype.netrcFile = function (filename, callback) {
  if(arguments.length < 2) {
    callback = filename;
    return this.getConfig('netrc', callback);
  }

  this.setConfig('netrc', filename, callback);
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

SporeConfig.prototype.defaultEnvs = function (envNamesArr, callback) {
  if(arguments.length < 2) {
    callback = envNamesArr;
    return this.getConfig('defaultEnvs', callback);
  }

  this.setConfig('defaultEnvs', envNamesArr, callback);
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

    self._api.use(function (err) {
      if(err && Errors.noConnection.test(err)) {
        self._offline();
      }
      if(!err) {
        self._online();
      }
    });

    callback(null, self._api);
  });

  return this;
};

Spore.prototype.netrc = function (callback) {
  var self = this;

  if(this._netrc) {
    process.nextTick(function () {
      callback(null, self._netrc);
    });
    return this;
  }

  this.netrcFile(function (err, netrcFile) {
    if(err) return callback(err);

    self._netrc = netrc;
    self._netrc.file(resolvePath(netrcFile));

    callback(null, self._netrc);
  });

  return this; 
};

SporeConfig.prototype.getConfig = function (keys, callback) {
  var self = this;

  debug("Retrieving config for " + keys);

  if(!this._config) {
    debug("Config not yet initialized");

    this._loadConfig(function (err) {
      if(err) return callback(err);

      callback.apply(null, [null].concat(self._getConfig(keys)));
    });

    return;
  }

  process.nextTick(function () {
    callback.apply(null, [null].concat(self._getConfig(keys)));
  });
};

SporeConfig.prototype._getConfig = function (keys) {
  var self = this;

  if(!Array.isArray(keys)) {
    keys = [keys];
  }

  return keys.map(function (key) {
    return self._config[key];
  });
};

// Get the current spore configuration, or create a config file
// with the default configuration if no config file exists
SporeConfig.prototype._loadConfig = function (callback) {
  var self = this;

  debug("Reading config file at " + this.configPath());

  fs.readJson(this.configPath(), { encoding: 'utf8' }, function (err, json) {
    if(err && err.code === 'ENOENT') {

      debug("No config file found, creating one.");

      fs.ensureDir(path.dirname(self.configPath()), function (err) {
        if(err) return callback(err);

        fs.writeFile(self.configPath(), stringify(self.defaultConfig), function (err) {
          if(err) return callback(err);

          debug("Default config written to " + self.configPath());

          self._loadConfig(callback);
        });
      });

      return;
    }

    if(err) return callback(err);

    debug("Config file found, loading");

    self._config = json;

    callback(null, self);
  });
};

SporeConfig.prototype.setConfig = function (key, value, callback) {
  var self = this;

  if(!this._config) {
    debug("Config not yet initialized");

    this._loadConfig(function (err) {
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

  debug("Writing to config file at " + this.configPath());

  fs.writeFile(this.configPath(), stringify(this._config), function (err) {
    if(err) return callback(err);

    callback(null, self._config);
  });
};
