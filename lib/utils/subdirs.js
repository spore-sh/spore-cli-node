var fs = require('fs-extra'),
    async = require('async');

module.exports = subdirs;

function subdirs(dir, callback) {
  fs.readdir(dir, function (err, files) {
    if(err) return callback(err);

    async.mapLimit(files, 100, function (file, next) {
      fs.stat(file, callback);
    }, function (err, stats) {
      if(err) return callback(err);

      files = files.filter(function (_file, i) {
        return stats[i].isDirectory();
      });

      callback(null, files);
    });
  });
}
