var EventEmitter = require('events').EventEmitter,
    debug = require('debug')('spore-cli'),
    Config = require('./spore/config'),
    Credentials = require('./spore/credentials'),
    Sync = require('./spore/sync'),
    App = require('./app'),
    mixin = require('./utils/mixin');

module.exports = Spore;

function Spore() {
  mixin(this, EventEmitter);
  mixin(this, Config);
  mixin(this, Credentials);
  mixin(this, Sync);
}

Spore.App = App;

Spore.prototype.loadApp = function (dir, callback) {
  return this.constructor.App.load(dir, this, callback);
};

Spore.prototype.createApp = function (dir, name, callback) {
  return this.constructor.App.create(dir, name, this, callback);
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
