var debug = require('debug')('spore-cli');

module.exports = SporeEnvDeployments;

function SporeEnvDeployments() {}

SporeEnvDeployments.createDeployment = function (name, callback) {
  var self = this;

  this.api(function (err, api) {
    if(err) return callback(err);

    api.deployments.create(self.app.id, self.name, { name: name }, callback);
  });
};

SporeEnvDeployments.removeDeployment = function (name, callback) {
  var self = this;

  this.api(function (err, api) {
    if(err) return callback(err);

    api.deployments.destroy(self.app.id, self.name, { name: name }, callback);
  });
};
