#!/usr/bin/env node

var program = require('commander'),
    Envy = require('./envy'),
    envy = new Envy(),
    pkg = require('./package.json'),
    readline = require('readline-sync');

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

    envy.signup(email, password, function (err, key) {
      if(err) error(err);

      envy.setKey(email, key);

      console.log("Signed up for Envy.");
    });
  });

program
  .command('login')
  .option("-e, --email <email>", "Email to log in with")
  .option("-p, --password <password>", "Password to log in with")
  .description("Log in to your Envy account")
  .action(function (options) {

    var email = options.email || readline.question("Email: "),
        password = options.password || readline.question("Password: ", { hideEchoBack: true });

    if(!email || !password) error(new Error("Email and password are required."));

    envy.login(email, password, function (err, key) {
      if(err) error(err);

      envy.setKey(email, key);

      console.log("Logged in to Envy.");
    });
  });

function error(err) {
  console.error(err.message);
  process.exit(1);
}

if (!process.argv.slice(2).length) {
  program.help();
}

program.parse(process.argv);
