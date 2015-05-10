var EnvyApi = require('envy-api'),
    path = require('path'),
    fs = require('fs'),
    netrc = require('netrc-rw');

module.exports = Envy;

function Envy(options) {
  this.api = new EnvyApi(options);
  this.dotEnvy = ".envy";
  this.defaultEnv = "development";
}

Envy.prototype.signup = function (email, password, callback) {
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

Envy.prototype.login = function (email, password, callback) {
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

Envy.prototype.readDotEnvy = function (dir, callback) {
  fs.readFile(path.join(dir, this.dotEnvy), { encoding: 'utf8' }, function (err, contents) {
    var vars = {};

    if(err && err.code === 'ENOENT') {
      // dot envy does not exist, so send back
      // an empty assignment
      return callback(null, vars);
    }

    if(err) return callback(err);

    try {
      contents.split("\n").forEach(function (line, i) {

        // remove comments
        if(line.indexOf('#') > -1) {
          line = line.substring(0, line.indexOf('#'));
        }

        var key,
            value;

        if(line.indexOf('=') === -1) {
          throw new Error("Invalid assignment on line " + i + ". " + line + " does not contain an `=`.");
        }

        key = line.substring(0, line.indexOf('='));
        value = line.substring(line.indexOf('=') + 1);

        vars[key] = value;
      });
    } catch(e) {
      return callback(e);
    }

    callback(null, vars);
  });
};

Envy.prototype.writeDotEnvy = function (appName, envName, dir, callback) {
  if(arguments.length < 4) {
    callback = dir;
    dir = envName;
    envName = this.defaultEnv;
  }

  var dotEnvy = this.dotEnvy;

  this.api.getDotEnvy(appName, envName, function (err, contents) {
    if(err) return callback(err);

    fs.writeFile(path.join(dir, dotEnvy), contents, callback);
  });
};

Envy.prototype.lookupName = function (dir) {
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

Envy.prototype._setKey = function (email, key) {
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

Envy.prototype.getKey = function () {
  var key;

  try {
    key = netrc.host(this.host).password;

    this.api.setKey(key);
  } catch(e) {
    return false;
  }

  return key;
};
