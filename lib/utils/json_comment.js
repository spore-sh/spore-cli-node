var merge = require('merge');

module.exports = jsonComment;

var commentKey = '__comments';

exports.write = function(json, comment) {
  var withComments = {};

  withComments[commentKey] = [comment];

  return merge(true, withComments, json);
};

exports.read = function (json) {
  if(json[commentKey] && Array.isArray(json[commentKey])) {
    return json[commentKey].join("\n");
  }
};

exports.strip = function (json) {
  json = merge({}, json);

  json[commentKey] = undefined;

  return json;
};
