var EventEmitter = require('events').EventEmitter,
    debug = require('debug')('spore-cli'),
    Config = require('./spore/config'),
    Credentials = require('./spore/credentials'),
    App = require('./app'),
    mixin = require('./utils/mixin');

module.exports = Spore;

function Spore() {
  mixin(this, EventEmitter);
  mixin(this, Config);
  mixin(this, Credentials);
}

Spore.spore = new Spore();
Spore.loadEnv = Spore.spore.loadEnv.bind(Spore.spore);

Spore.App = App;

Spore.prototype.loadApp = function (dir, callback) {
  return this.constructor.App.load(dir, this, callback);
};

Spore.prototype.createApp = function (dir, name, callback) {
  return this.constructor.App.create(dir, name, this, callback);
};

// Load an environment into the current process
Spore.prototype.loadEnv = function (envName) {
  var self = this;

  this.loadApp(process.cwd(), function (err, app) {
    if(err) throw err;

    spore.defaultEnv(function (err, defaultEnv) {
      if(err) throw err;

      app.get(envName || defaultEnv, function (err, envValues) {
        if(err) throw err;

        Object.keys(envValues).forEach(function (key) {
          process.env[key] = envValues[key];
        });
      });
    });
  });
};

// This doesn't have a good place, so it will sit in main
Spore.prototype.accept = function (token, callback) {
  var App = this.constructor.App,
      spore = this;

  debug("Accepting invitation to collaborate on an app");

  this.api(function (err, api) {
    if(err) return callback(err);

    api.memberships.accept(token, function (err, membership, invite) {
      if(err) return callback(err);

      api.apps.get(invite.app, function (err, appJson) {
        if(err) return callback(err);

        app = new App(spore);
        app._load(appJson);

        callback(null, app.findEnv(invite.environment));
      });
    });
  });
};
