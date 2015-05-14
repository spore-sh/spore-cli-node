module.exports = cellPathParse;

function cellPathParse(path) {
  var sep = '/',
      firstIndex = path.indexOf(sep),
      lastIndex = path.lastIndexOf(sep),
      app,
      env,
      cell;

  if(firstIndex === -1 || lastIndex === -1) {
    throw Errors.badPath.build(path, sep);
  }

  app = path.substring(0, firstIndex);
  env = path.substring(firstIndex + sep.length, lastIndex);
  cell = path.substring(lastIndex + sep.length);

  return {
    app: app,
    env: env,
    cell: cell
  };
}
