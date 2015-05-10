#!/usr/bin/env node

var program = require('commander'),
    path = require('path'),
    Envy = require('./envy'),
    envy = new Envy(),
    pkg = require('./package.json'),
    readline = require('readline-sync'),
    colors = require('colors');

colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});

program
  .version(pkg.version);

program
  .command('signup')
  .option("-e, --email <email>", "Email to sign up with")
  .option("-p, --password <password>", "Password to sign up with")
  .description("Create an Envy account")
  .action(function (options) {

    var email = options.email || readline.question("Email: "),
        password = options.password || readline.question("Password: ", { hideEchoBack: true });

    if(!email || !password) return error(new Error("Email and password are required."));

    envy.signup(email, password, function (err, user) {
      if(err) return error(err);

      info("Account created for " + user.email + ".");
    });
  });

program
  .command('login')
  .option("-e, --email <email>", "Email to log in with")
  .option("-p, --password <password>", "Password to log in with")
  .description("Log in to your Envy account")
  .action(function (options) {

    login(options.email, options.password, function (_, user) {
      info("Logged in as " + user.email + ".");
    });
  });

program
  .command('apps')
  .description("List all the apps you have access to")
  .action(function () {
    ensureLogin(function () {
      envy.api.listApps(function (err, apps) {
        if(err) return error(err);

        if(apps.length) {
          info("Apps:\n" + apps.map(function (app) {
            return app.name;
          }).join("\n"));
        } else {
          warn("No Apps found.");
          help("Create a new app with `envy new`.");
        }
      });
    });
  });

program
  .command('new [dir]')
  .alias('init [dir]')
  .option('-a, --app <appName>', "Name of the application")
  .description("Add a new app to Envy")
  .action(function (dir, options) {
    ensureLogin(function () {
      var appName = options.appName;
      dir = path.resolve(process.cwd(), dir);

      if(!appName) {
        appName = envy.lookupName(dir);
      }

      envy.api.createApp(appName, function (err, app) {
        if(err.message === "App already exists.") {

        }

        envy.writeDotEnvy(app.name, dir, function (err) {
          if(err) return error(err);

          info(app.name + " created.");
        });
      });
    });
  });

program
  .command('set [KEY=value]')
  .option('-a, --app <appName>', "Name of the application")
  .option('-e, --env <envName>', "Name of the environment")
  .description("Set an environment variable")
  .action(function (set, options) {
    if(set.indexOf('=') === -1) {
      return error(new Error("A set operation should be of the form ENV_VARIABLE=value"));
    }
    ensureLogin(function () {
      var key,
          value;

      key = set.substring(0, set.indexOf('='));
      value = set.substring(set.indexOf('=') + 1);

      getAppAndEnv(process.cwd(), options.appName, options.envName, function (appName, envName) {
        envy.api.set(appName, envName, key, value, function (err) {
          if(err) return error(err);

          log("`" + key + "` updated to `" + value + "` for app: `" + appName + "` in environment: `" + envName + "`.");

          // only write the dot-envy back to this directory
          // if it's the right app and environment
          // (i.e. they weren't setting a variable for a different app)
          getAppAndEnv(process.cwd(), null, null, function (defaultApp, defaultEnv) {
            if(defaultApp === appName && defaultEnv === envName) {
              envy.writeDotEnvy(appName, envName, process.cwd(), function (err) {
                log("local environment variables updated.");
              });
            } else {
              help("`" + key + "` was not updated locally because the local app/environment of " + defaultApp + "/" + defaultEnv + " didn't match the one you set.");
            }
          });
        });
      });
    });
  });

function getAppAndEnv(dir, appName, envName, callback) {
  if(appName && envName) {
    return callback(appName, envName);
  }

  envy.readDotEnvy(dir, function (err, vars) {
    if(err) return error(err);

    if(!appName) {
      appName = vars.ENVY_APP_NAME;
    }

    if(!appName) {
      appName = envy.lookupName(dir);
    }

    if(!envName) {
      envName = vars.ENVY_ENV_NAME;
    }

    if(!envName) {
      envName = envy.defaultEnv;
    }

    callback(appName, envName);
  });
}

function ensureLogin(callback) {
  if(envy.getKey()) {
    return callback(null, true);
  }

  login(null, null, callback);
}

function login(email, password, callback) {
  email = email || readline.question("Email: ");
  password = password || readline.question("Password: ", { hideEchoBack: true });

  if(!email || !password) return error(new Error("Email and password are required."));

  envy.login(email, password, function (err, user) {
    if(err) error(err);

    callback(null, user);
  });
}

function error(err) {
  console.error(err.message.error);
}

function info(message) {
  console.info(message.info);
}

function help(message) {
  console.log(message.help);
}

function warn(message) {
  console.warn(message.warn);
}

if (!process.argv.slice(2).length) {
  program.help();
}

program.parse(process.argv);
