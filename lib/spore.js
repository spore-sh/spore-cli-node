var Config = require('./spore/config'),
    Credentials = require('./spore/credentials'),
    Sync = require('./spore/sync'),
    App = require('./app'),
    mixin = require('./utils/mixin'),
    EventEmitter = require('events').EventEmitter;

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
