var Spore = require('spore-node'),
    Config = require('./spore/config'),
    debug = require('debug')('spore-cli'),
    App = require('./app');

module.exports = Spore;

Spore.Config = Config;
Spore.App = App;

Spore.prototype.createApp = function (dir, name, callback) {
  return this.constructor.App.create(dir, name, this, callback);
};

Spore.prototype.signup = function (email, password, callback) {
  var config = this.config;

  debug("Signing up for Spore pod");

  this.api(false).users.signup(email, password, function (err, user) {
    if(err) return callback(err);

    debug("Sign up successful, saving credentials to netrc");

    try {
      config.setCredentials(user.email, user.key);
    } catch(e) {
      return callback(e);
    }

    callback(null, user);
  });
};

Spore.prototype.login = function (email, password, callback) {
  var config = this.config;

  debug("Logging into Spore pod");

  this.api(false).users.login(email, password, function (err, key) {
    if(err) return callback(err);

    debug("Log in successful, saving credentials to netrc");

    try {
      config.setCredentials(email, key);
    } catch(e) {
      return callback(e);
    }

    callback(null, { email: email, key: key });
  });
};

Spore.prototype.verify = function (token, callback) {
  debug("Verifying email address");

  this.api().users.verify(token, callback);
};

Spore.prototype.accept = function (token, callback) {
  var App = this.constructor.App,
      spore = this;

  debug("Accepting invitation to collaborate on an app");

  this.api().memberships.accept(token, function (err, membership, invite) {
    if(err) return callback(err);

    spore.api().apps.get(invite.app, function (err, appJson) {
      if(err) return callback(err);

      app = new App(spore);
      app._load(appJson);

      callback(null, app.findEnv(invite.environment));
    });
  });
};
