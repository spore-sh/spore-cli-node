var SporeConfig = require('./spore/config'),
    SporeCredentials = require('./spore/credentials'),
    SporeSync = require('./spore/sync'),
    SporeApp = require('./app'),
    mixin = require('./utils/mixin'),
    cellPathParse = require('spore-cell-parse'),
    path = require('path'),
    fs = require('fs-extra'),
    touch = require('touch'),
    debug = require('debug')('spore-cli'),
    async = require('async'),
    EventEmitter = require('events').EventEmitter;

module.exports = Spore;

function Spore() {
  mixin(this, EventEmitter);
  mixin(this, SporeConfig);
  mixin(this, SporeCredentials);
  mixin(this, SporeSync);
}

Spore.App = SporeApp;

Spore.prototype.loadApp = function (dir, callback) {
  return this.constructor.App.load(dir, this, callback);
};

Spore.prototype.createApp = function (dir, name, callback) {
  return this.constructor.App.create(dir, name, this, callback);
};
