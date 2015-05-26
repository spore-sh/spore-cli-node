var exec = require('child_process').execFile,
    async = require('async');

module.exports = function (program, spore, utils) {
  program
    .command('migrate:heroku <environment>')
    .option('-d, --directory <directory>', "Directory which contains the Spore")
    .option('-a, --app <name>', "Name of the Heroku App")
    .description("Migrate a Heroku app to a Spore environment")
    .action(function (envName, options) {
      utils.loadApp(options.directory, function (app) {

        getAppName(options.app, function (err, herokuName) {
          if(err) return utils.error(err);

          app.findEnv(envName).createDeployment('heroku-' + herokuName, function (err, deployment) {
            if(err) return utils.error(err);

            utils.info("Deployment `heroku-" + herokuName + "` created for " + app.findEnv(envName).fullName());

            setVar(herokuName, 'SPORE_DEPLOYMENT', deployment.exports, function (err, exports) {
              if(err) return utils.error(err);

              utils.info("Deployment key set on Heroku for `" + herokuName + "`");

              getVars(herokuName, function (err, vals) {
                if(err) return utils.error(err);

                utils.info("Retrieved environment variables from `" + herokuName + "`");

                // don't set spore deployment in the spore file
                delete vals.SPORE_DEPLOYMENT;

                async.each(Object.keys(vals), function (key, next) {
                  app.set(envName, key, vals[key], next);
                }, function (err) {
                  if(err) return utils.error(err);

                  utils.info("Set " + Object.keys(vals).length + " environment variables for " + app.findEnv(envName).fullName());
                  utils.help("View your environment variables with `spore get -e " + envName + "`");
                });
              });
            });
          });
        });
      });
    });

  return program;
};

function getVars(appName, callback) {
  var args = ['config'],
      cmd = 'heroku';

  args = args.concat(['-a', appName]);

  exec(cmd, args, function (err, stdout, stderr) {
    if(err) return callback(new Error(stderr || err));

    var lines = stdout.trim().split("\n"),
        vals = {},
        line;

    // first line is something like `=== app-name Config Vars`
    lines.shift();

    for(var i=0; i<lines.length; i++) {
      line = lines[i];

      if(line.indexOf(':') === -1) {
        return callback(new Error("Unable to parse output of " + cmdName(cmd, args)));
      }

      vals[line.substring(0, line.indexOf(':'))] = line.slice(line.indexOf(':') + 1).trim();
    }

    callback(null, vals);
  });
}

function setVar(appName, key, value, callback) {
  var args = ['config:set'],
      cmd = 'heroku';

  args.push(key + '=' + value);
  args = args.concat(['-a', appName]);

  exec(cmd, args, function (err, stdout, stderr) {
    if(err) return callback(new Error(stderr || err));

    callback(null, key + '=' + value);
  });
}

function getAppName(name, callback) {
  var args = ['apps:info'],
      cmd = 'heroku';

  if(name) {
    args = args.concat(['-a', name]);
  }


  exec(cmd, args, function (err, stdout, stderr) {
    if(err) return callback(new Error(stderr || err));

    var firstLine = stdout.split("\n")[0],
        delimiter = '=== ';

    if(!firstLine || firstLine.indexOf(delimiter) !== 0 || !firstLine.slice(delimiter.length)) return callback(new Error("Unable to parse output of " + cmdName(cmd, args)));

    callback(null, firstLine.slice(delimiter.length));
  });
}

function cmdName(cmd, args) {
  return "`" + cmd + " " + args.join(' ') + "`";
}
