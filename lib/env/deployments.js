module.exports = SporeEnvDeployments;

function SporeEnvDeployments() {}

SporeEnvDeployments.prototype.createDeployment = function (name, callback) {
  return this.api().deployments.create(this.app.id, this.name, { name: name }, callback);
};

SporeEnvDeployments.prototype.removeDeployment = function (name, callback) {
  return this.api().deployments.destroy(this.app.id, this.name, { name: name }, callback);
};
