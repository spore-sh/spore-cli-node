var readline = require('readline-sync');

module.exports = function (program, spore, utils) {
  program
    .command('account:signup')
    .alias('signup')
    .option("-e, --email <email>", "Email to sign up with")
    .option("-p, --password <password>", "Password to sign up with")
    .description("Create an account on the Spore Pod")
    .action(function (options) {

      var email = options.email || readline.question("Email: ".prompt),
          password = options.password || readline.question("Password: ".prompt, { hideEchoBack: true });

      if(!email || !password) return utils.error(new Error("Email and password are required."));

      spore.signup(email, password, function (err, user) {
        if(err) return utils.error(err);

        utils.info("Account created for " + user.email + ".");
      });
    });

  program
    .command('account:login')
    .alias('login')
    .option("-e, --email <email>", "Email to log in with")
    .option("-p, --password <password>", "Password to log in with")
    .description("Log in to the Spore Pod")
    .action(function (options) {

      utils.login(options.email, options.password, function (user) {
        utils.info("Logged in as " + user.email + ".");
      });

    });

  program
    .command('account:verify <token>')
    .alias('verify')
    .description("Verify your email address")
    .action(function (token) {
      utils.ensureLogin(function () {
        spore.verify(token, function (err, user) {
          if(err) return utils.error(err);

          utils.info(user.email + " has been verified");
        });
      });
    });

  return program;
};
