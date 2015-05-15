module.exports = mixin;

function mixin(obj, plugin) {
  plugin.call(obj);

  Object.keys(plugin.prototype).forEach(function (k) {
    if(!obj.constructor.prototype[k]) {
      obj.constructor.prototype[k] = plugin.prototype[k];
    }
  });
}
