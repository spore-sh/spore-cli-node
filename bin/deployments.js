module.exports = function (program, spore, utils) {
  program
    .command('deployments:create <name>')
    .alias('deploy')
    .option('-d, --directory <directory>', "Directory which contains the Spore")
    .option('-e, --environment <name>', "Name of environment to create the deployment for")
    .description("Create a new deployment for a Spore")
    .action(function (name, options) {
      utils.loadApp(options.directory, function (app) {

        var envName = options.environment || spore.config.defaultEnv();

        app.findEnv(envName).createDeployment(name, function (err, deployment) {
          if(err) return utils.error(err);

          utils.info("Deployment `" + name + "` created for " + app.findEnv(envName).fullName());
          utils.help("Set the environment variable below on your server to have access to your Spore environment");
          utils.log("SPORE_DEPLOYMENT=" + deployment.exports);
        });
      });
    });

  return program;
};
