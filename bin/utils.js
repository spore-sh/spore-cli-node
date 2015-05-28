var readline = require('readline-sync'),
    Errors = require('spore-errors'),
    resolvePath = require('../lib/utils/resolve_path');

module.exports = function (spore, utils) {
  utils = utils || {};

  utils.loadApp = function (dir, callback) {
    utils.ensureLogin(function () {
      spore.loadApp(resolvePath(process.cwd(), dir || '.'), function (err, app) {
        if(err) return utils.error(err);

        callback(app);
      });
    });
  };

  utils.ensureLogin = function (callback) {
    var user = spore.config.getCredentials();

    if(user) {
      return callback(user);
    }

    utils.log("You need to log into your Spore Pod.");
    utils.help("Create an account with `spore account:signup`");

    utils.login(null, null, callback);  
  };

  utils.login = function (email, password, callback) {
    email = email || readline.question("Email: ".prompt);
    password = password || readline.question("Password: ".prompt, { hideEchoBack: true });

    if(!email || !password) return utils.error(new Error("Email and password are required."));

    spore.login(email, password, function (err, user) {
      if(err) return utils.error(err);

      callback(user);
    });
  };

  utils.log = function (message) {
    console.log(message.data);
  };

  utils.error = function (err, exit) {
    console.error(err.message.error);
    if(Errors.noAppFound.test(err)) {
      utils.help("Make sure you're in your app's root, or create a new Spore with `spore init`");
    }

    if(exit !== false) {
      process.exit(1);
    }
  };

  utils.info = function (message) {
    console.info(message.info);
  };

  utils.help = function (message) {
    console.info(message.help);
  };

  utils.warn = function (message) {
    console.warn(message.warn);
  };

  return utils;
};
