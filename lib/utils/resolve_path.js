var path = require('path'),
    expandHome = require('expand-home-dir');

module.exports = function (paths) {
  return path.join.apply(path, [expandHome(arguments[0])].concat([].slice.call(arguments, 1)));
};
