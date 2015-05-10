#!/usr/bin/env node

var program = require('commander'),
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

    if(!email || !password) error(new Error("Email and password are required."));

    envy.signup(email, password, function (err, user) {
      if(err) error(err);

      log("Account created for " + user.email + ".");
    });
  });

program
  .command('login')
  .option("-e, --email <email>", "Email to log in with")
  .option("-p, --password <password>", "Password to log in with")
  .description("Log in to your Envy account")
  .action(function (options) {

    login(options.email, options.password, function (_, user) {
      log("Logged in as " + user.email + ".");
    });
  });

program
  .command('apps')
  .description("List all the apps you have access to")
  .action(function () {
    ensureLogin(function () {
      envy.listApps(function (err, apps) {
        if(err) error(err);

        if(apps.length) {
          log("Apps:\n" + apps.map(function (app) {
            return app.name;
          }).join("\n"));
        } else {
          warn("No Apps found. Create one with `envy new`.");
        }
      });
    });
  });

function ensureLogin(callback) {
  if(envy.getKey()) {
    return callback(null, true);
  }

  login(null, null, callback);
}

function login(email, password, callback) {
  email = email || readline.question("Email: ");
  password = password || readline.question("Password: ", { hideEchoBack: true });

  if(!email || !password) error(new Error("Email and password are required."));

  envy.login(email, password, function (err, user) {
    if(err) error(err);

    callback(null, user);
  });
}

function error(err) {
  console.error(err.message.error);
  process.exit(1);
}

function log(message) {
  console.info(message.info);
}

function warn(message) {
  console.warn(message.warn);
}

if (!process.argv.slice(2).length) {
  program.help();
}

program.parse(process.argv);
