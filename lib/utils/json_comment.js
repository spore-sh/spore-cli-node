var merge = require('merge'),
    commentKey = '__comments';

exports.write = function(json, comment) {
  json = merge(true, json);

  if(!json[commentKey]) {
    json[commentKey] = [];
  }

  json[commentKey].push(comment);
  return json;
};

exports.read = function (json) {
  if(json[commentKey] && Array.isArray(json[commentKey])) {
    return json[commentKey].join("\n");
  }
};

exports.strip = function (json) {
  json = merge(true, json);

  json[commentKey] = undefined;

  return json;
};
