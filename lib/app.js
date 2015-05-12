var uuid = require('node-uuid').v4;

module.exports = SporeApp;

function SporeApp(options) {
  this.name = options.name;
  this.id = options.id || uuid();
}
