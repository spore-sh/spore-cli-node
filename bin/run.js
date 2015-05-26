
module.exports = function (program, spore, utils) {

  program
    .command('run <commands...>')
    .alias('exec')
    .option('-d, --directory <directory>', "Directory in which contains the Spore")
    .option('-e, --environment <envName>', "Name of the environment")
    .description("Run a command with Spore environment variables loaded")
    .action(function (cmds, options) {
      utils.loadApp(options.directory, function (app) {

        app.run(cmds, options.environment || spore.config.defaultEnv(), function (err, childProc) {
          if(err) return utils.error(err);

          childProc.stdout.on('data', function (data) {
            process.stdout.write(data);
          });

          childProc.stderr.on('data', function (data) {
            process.stderr.write(data);
          });

          childProc.on('error', function (err) {
            utils.error(err);
          });

          childProc.on('close', function (code) {
            process.exit(0);
          });
        });
      });
    });

  return program;
};
