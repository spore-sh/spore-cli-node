var readline = require('readline-sync'),
    async = require('async');

module.exports = function (program, spore, utils) {

  program
    .command('copy <sourceEnvironment>')
    .option('-d, --directory <directory>', "Directory which contains the Spore")
    .option('-e, --environment <name>', "Name of the target environment")
    .option('-p, --prompt', "Prompt to set the value for each key rather than using the value from the source")
    .description("Copy the keys from a target environment to a source environment")
    .action(function (sourceName, options) {
      var targetName = options.environment || spore.config.defaultEnv();

      utils.loadApp(options.directory, function (app) {
        app.get(sourceName, function (err, kv) {
          if(err) return utils.error(err);

          var keysSet = [],
              getValue = function (key) {
                return kv[key];
              };

          if(options.prompt) {
            utils.log((targetName + ":").prompt);

            getValue = function (key) {
              return readline.question((spaces(2) + key + ": (Enter for \"${defaultInput}\", `-` to skip) ").prompt, {
                defaultInput: kv[key],
                keepWhitespace: true,
                falseValue: '-'
              });
            };
          }

          async.each(Object.keys(kv), function (key, next) {

            var value = getValue(key);

            if(!value) {
              return next();
            }

            keysSet.push(key);

            app.set(targetName, key, value, next);

          }, function (err) {
            if(err) return utils.error(err);

            utils.info(keysSet + " set for " + app.findEnv(targetName).fullName() + " from " + app.findEnv(sourceName).fullName());
          });
        });
      });
    });

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
          
          value = readline.question((spaces(2) + key + ": ").prompt, { keepWhitespace: true });

          app.setAll(key, value, function (err) {
            if(err) return utils.error(err);

            utils.info(key + " set for " + app.name + "/" + envNames);
          });

          return;
        }

        if(options.prompt) {

          async.each(app.envs, function (env, next) {
            utils.log((env.name + ":").prompt);

            var value = readline.question((spaces(2) + key + ": ").prompt);

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
    
    value = readline.question((spaces(2) + key + ": ").prompt);

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
    var tabsRight = maxLength(Object.keys(kv));

    Object.keys(kv).forEach(function (key) {
      printKv(key, kv[key], tabs, tabsRight);
    });
  }

  function printKv(key, value, tabs, tabsRight) {
    tabs = tabs || 0;
    tabsRight = tabsRight || key.length;
    utils.log(spaces(tabs) + key + ": " + spaces(tabsRight - key.length) + value);
  }

  return program;
};

function spaces(n) {
  return new Array(n + 1).join(' ');
}

function maxLength(arr) {
  return Math.max.apply(null, arr.map(function (str) {
    return str.length;
  })) || 0;
}
