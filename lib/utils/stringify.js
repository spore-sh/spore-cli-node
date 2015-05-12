module.exports = stringify;

function stringify(json) {
  return JSON.stringify(json, null, 2);
}
