var resolvePath = require('../lib/utils/resolve_path');

module.exports = function (program, spore, utils) {
  program
    .command('init [dir]')
    .option('-n, --app-name <applicationName>', "Name of the application")
    .description("Create a new Spore")
    .action(function (dir, options) {
      utils.ensureLogin(function () {
        var name = options['app-name'];
        dir = resolvePath(process.cwd(), dir || ".");

        spore.createApp(dir, name, function (err, app) {
          if(err) return utils.error(err);

          utils.info(app.name + " created.");
        });
      });
    });

  return program;
};
