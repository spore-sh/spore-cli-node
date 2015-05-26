var readline = require('readline-sync'),
    async = require('async');

module.exports = function (program, spore, utils) {
  program
    .command('set <key>')
    .option('-d, --directory <directory>', "Directory which contains the Spore")
    .option('-e, --environment <name>', "Name of environment to set the key for")
    .option('-p, --prompt', "Prompt to set the key for every environment")
    .option('-a, --all', "Set this key to the same value for all environments")
    .description("Set an environment variable for a Spore")
    .action(function (key, options) {
      utils.loadApp(options.directory, function (app) {

        var value;

        if(options.all) {

          var envNames = app.envs.map(function (env) {
            return env.name;
          }).join();

          console.log((envNames + ":").prompt);
          
          value = readline.question(("  " + key + "=").prompt);

          app.setAll(key, value, function (err) {
            if(err) return utils.error(err);

            utils.info(key + " set for " + app.name + "/" + envNames);
          });

          return;
        }

        if(options.prompt) {

          async.each(app.envs, function (env, next) {
            utils.log((env.name + ":").prompt);

            var value = readline.question(("  " + key + "=").prompt);

            app.set(env.name, key, value, next);
          }, function (err) {
            if(err) return utils.error(err);

            utils.info(key + " set for " + app.name + "/" + app.envs.map(function (env) {
              return env.name;
            }));
          });

          return;
        }

        setForEnv(app, options.environment || spore.config.defaultEnv(), key);
      });
    });

  function setForEnv(app, envName, key) {
    utils.log((envName + ":").prompt);
    
    value = readline.question(("  " + key + "=").prompt);

    app.set(envName, key, value, function (err) {
      if(err) return utils.error(err);

      utils.info(key + " set for " + app.name + "/" + envName);
    });
  }

  program
    .command('get [key]')
    .option('-d, --directory <directory>', "Directory which contains the Spore")
    .option('-e, --environment <name>', "Name of the environment to get the key from")
    .option('-a, --all', "Get a key's value for all environments")
    .description("Get environment variable(s) for a Spore")
    .action(function (key, options) {
      utils.loadApp(options.directory, function (app) {

        if(options.all) {
          app.envs.forEach(function (env) {
            getForEnv(app, env.name, key);
          });
          return;
        }

        getForEnv(app, options.environment || spore.config.defaultEnv(), key);
      });
    });

  function getForEnv(app, envName, key) {
    if(key) {
      app.get(envName, key, function (err, val) {
        if(err) return utils.error(err);

        utils.log(envName + ":");
        printKv(key, val, 2);
      });
      return;
    }

    app.get(envName, function (err, kv) {
      if(err) return utils.error(err);

      utils.log(envName + ":");
      printKvs(kv, 2);
    });
  }

  function printKvs(kv, tabs) {
    Object.keys(kv).forEach(function (key) {
      printKv(key, kv[key], tabs);
    });
  }

  function printKv(key, value, tabs) {
    tabs = tabs || 0;
    utils.log(new Array(tabs + 1).join(' ') + key + "=" + value);
  }

  return program;
};
