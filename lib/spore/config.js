var Config = require('spore').Config;

module.exports = Config;

Config.prototype.defaultEnvs = function (envNamesArr, callback) {
  if(arguments.length < 2) {
    callback = envNamesArr;
    return this.getConfig('defaultEnvs', callback);
  }

  this.setConfig('defaultEnvs', envNamesArr, callback);
};
