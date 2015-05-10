var request = require('request'),
    netrc = require('netrc-rw');

function Envy(options) {
  options = options || {};
  this.host = options.host || "0.0.0.0";
  this.port = options.port || 3000;
  this.protocol = options.protocol || "http";
}

Envy.prototype.signup = function (email, password, callback) {
  this.request("/signup", { email: email, password: password }, function (err, body) {
    if(err) return callback(err);

    callback(null, body.user.key);
  });
};

Envy.prototype.login = function (email, password, callback) {
  this.request("/login", { email: email, password: password }, function (err, body) {
    if(err) return callback(err);

    callback(null, body.user.key);
  });
};

Envy.prototype.setKey = function (email, key) {
  netrc.read();

  if(!netrc.machines[this.host]) {
    netrc.addMachine(this.host, {});
  }

  netrc.host(this.host).login = email;
  netrc.host(this.host).password = key;

  netrc.write();
};

Envy.prototype.getKey = function () {
  return netrc.host(this.host).password;
};

Envy.prototype.request = function (path, data, callback) {
  request.post(
    this.url(path),
    { form: data },
    function (err, res, body) {
      if(err) return callback(err);

      var json;
      try {
        json = JSON.parse(body);
      } catch(e) {
        json = {};
      }

      if(res.statusCode !== 200) {

        if(json.error) {
          err = new Error(json.error.message);
        } else {
          err = new Error("Unknown Error with status " + res.statusCode + "\n" + body);
        }

        return callback(err);
      }

      callback(null, json);
    }
  );
};

Envy.prototype.url = function (path) {
  var url = this.protocol + "://" + this.host;

  if(!this.usesDefaultPort()) {
    url += ":" + this.port;
  }

  url += path;

  return url;
};

Envy.prototype.usesDefaultPort = function () {
  return (this.protocol === "http" && this.port.toString() === "80") ||
    (this.protocol === "https" && this.port.toString() === "443");
};

module.exports = Envy;
