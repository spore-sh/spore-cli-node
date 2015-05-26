
module.exports = function (program, spore, utils) {

  program
    .command('memberships:grant <email>')
    .alias('grant')
    .option('-d, --directory <directory>', "Directory which contains the Spore")
    .option('-e, --environment <name>', "Name of environment to grant permissions for")
    .option('-a, --all', "Grant read access for all environments of this Spore")
    .description("Grant read permissions to a user for a Spore")
    .action(function (email, options) {
      utils.loadApp(options.directory, function (app) {

        if(options.all) {
          app.grantAll(
            email,
            accessGranted(email, app.fullName() + "/" + app.envs.map(function (env) {
              return env.name;
            }))
          );

          return;
        }

        var envName = options.environment || spore.config.defaultEnv();

        app.grant(envName, email, accessGranted(email, app.fullName() + "/" + envName));
      });
    });

  function accessGranted(email, name) {
    return function (err) {
      if(err) return utils.error(err);
      utils.info("Read access to " + name + " granted for " + email);
    };
  }

  program
    .command('memberships:accept <token>')
    .alias('accept')
    .description("Accept invitation to collaborate on a Spore")
    .action(function (token) {
      utils.ensureLogin(function () {
        spore.accept(token, function (err, env) {
          if(err) return utils.error(err);

          utils.info("You now have access to " + env.fullName());
        });
      });
    });

  program
    .command('memberships:revoke <email>')
    .alias('revoke')
    .option('-d, --directory <directory>', "Directory which contains the Spore")
    .option('-e, --environment <name>', "Name of environment to revoke permissions for")
    .option('-a, --all', "Revoke read access for all environments of this Spore")
    .description("Revoke read permissions from a user for a Spore")
    .action(function (email, options) {
      utils.loadApp(options.directory, function (app) {

        if(options.all) {
          app.revokeAll(
            email,
            accessRevoked(email, app.fullName() + "/" + app.envs.map(function (env) {
              return env.name;
            }))
          );

          return;
        }

        var envName = options.environment || spore.config.defaultEnv();

        app.revoke(envName, email, accessRevoked(email, app.fullName() + "/" + envName));
      });
    });

  function accessRevoked(email, name) {
    return function (err) {
      if(err) return utils.error(err);
      utils.info("Read access to " + name + " revoked for " + email);
    };
  }

  program
    .command('memberships:list')
    .option('-d, --directory <directory>', "Directory which contains the Spore")
    .option('-e, --environment <name>', "Name of environment to view users for")
    .option('-a, --all', "View users for all environments of the Spore")
    .description("List the users with read access for a Spore")
    .action(function (options) {
      utils.loadApp(options.directory, function (app) {

        if(options.all) {
          app.allUsers(function (err, allUsers) {
            if(err) return utils.error(err);

            Object.keys(allUsers).forEach(function (envName) {
              printUsers(envName, allUsers[envName]);
            });
          });

          return;
        }

        var envName = options.environment || spore.config.defaultEnv();

        app.users(envName, function (err, users) {
          if(err) return utils.error(err);

          printUsers(envName, users);
        });
      });
    });

  function printUsers(envName, users) {
    utils.log(envName + ":");

    utils.log("  " + users.join("\n  "));
  }

  return program;
};
