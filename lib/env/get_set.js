var debug = require('debug')('spore-cli'),
    SporeEnvGetSet = require('spore').App.Env.GetSet;

module.exports = SporeEnvGetSet;

SporeEnvGetSet.prototype.set = function (key, value, callback) {
  debug("Setting " + key + " for " + this.fullName());

  var cell = this.findCellByKey(key);

  return cell.setValue(value, callback);
};
