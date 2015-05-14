var spawn = require('child_process').spawn,
    Errors = require('./errors'),
    debug = require('debug')('spore-cli');

module.exports = SporeAppRunner;

function SporeAppRunner() {

}

SporeAppRunner.prototype.run = function (cmds, envName, callback) {
  debug("Running " + cmds[0] + " on " + this.fullName() + "/" + envName);

  this.get(envName, function (err, envValues) {
    if(err) return callback(err);

    // use the current environment for defaults
    for(var p in process.env) {
      if(envValues[p] === undefined) {
        envValues[p] = process.env[p];
      }
    }

    var cmd = cmds.shift(),
        args = cmds,
        child;

    debug("Spawning " + cmd + " with arguments: " + args.join(', '));
    child = spawn(cmd, args, { env: envValues });

    callback(null, child);
  });
};
