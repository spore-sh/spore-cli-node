var path = require('path');

module.exports = resolvePath;

function resolvePath(str, args) {
  if (str.substr(0, 2) === '~/') {
    str = (process.env.HOME || process.env.HOMEPATH || process.env.HOMEDIR || process.cwd()) + str.substr(1);
  }
  return path.resolve.apply(path, [str].concat([].slice.call(arguments, 1)));
}
