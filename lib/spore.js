var Spore = require('spore'),
    Credentials = require('./spore/credentials'),
    debug = require('debug')('spore-cli'),
    App = require('./app');

module.exports = Spore;

Spore.Credentials = Credentials;
Spore.App = App;

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
