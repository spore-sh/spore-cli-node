spore-cli
=========

This is the CLI for [Spore](https://spore.sh). Please see the [official website](https://spore.sh)
for more information.

Installation
------------

The best way to install the Spore CLI is using the [install script for Spore](https://spore.sh/documentation#installation).

However, you can install the Spore CLI by itself with the following:

```
$ npm install -g spore-cli
```

or:

```
$ npm install -g git://git@github.com:spore-sh/spore-cli-node.git
```

Please note that if you install Spore CLI without the [install script](https://spore.sh/documentation#installation)
you'll also need to install [spored](https://github.com/spore-sh/spored) and have it running.

Alternatively, if you don't need to offline usage, you can set `useProxy` in your `~/.spore/config.json` to `false`,
and you won't need `spored`.

Commands
--------

Please see the [official documentation](https://spore.sh/documentation) for a more user-friendly manual. This README
simply lays out all of the commands available for `spore-cli`.

### Account

Account commands interact with the [Spore Pod](https://github.com/spore-sh/spore-pod), and can't be done offline. They also do not need to be in an app directory.

#### Sign Up

```
$ spore account:signup <YOUR_EMAIL>
```

If you use the [install script](https://spore.sh/documentation#installation), you won't need to sign up, as you
would have been prompted during the installation process.

Signing up will automatically log you in, and store your email and API key in your `.netrc` file.

#### Log In

```
$ spore account:login
```

"Login" is a bit of a misnomer, as logging in actually invalidates your old API key and generates a new one. The CLI
will automatically store your new API key in your `.netrc` file, so it will feel like a login session (i.e. you don't
need to login again to execute subsequent commands).

#### Verify

```
$ spore account:verify <YOUR_TOKEN>
```

Verifies your email address. You trigger an email verification by trying to grant permissions to other users. The
email will contain your verification token, which is the only parameter for this command.


### Init

```
$ spore init [DIRECTORY]
```

Create a new Spore in an app directory. If no directory is given, `.` is assumed. You can give your app a name
with the `-n, `--app-name` flag. Otherwise, it will look at the `package.json` or directory name to determine
the app's name. You can help improve `spore-cli` by [adding name lookups for different frameworks](lib/utils/lookup.js).

### Memberships

Memberships refer to users participation in an app. They refer *only* to read access, as anyone with a Spore
account can write to a Spore (however, without modifying the `.spore` file, you wouldn't ever know it).

#### Grant

```
$ spore memberships:grant <THEIR_EMAIL>
```

Grant read access to the default environment in the current app. This process is not instant - it will send them an
email, and required them to [accept the membership](#accept).

You can specify the directory of the app with `-d, --directory`, and the environment to grant with `-e, --environment`.
You can also grant to all environments with `-a, --all`. However, granting access to more than the development environment is **not recommended**.

Spore is designed such that any member of your team can create environment variables, so read access isn't necessary, even
if a dev wants to add a variable to production. If you grant access to more than the development environment, you'll need
to roll all your environment variables when you revoke access - a big hassle.

#### Revoke

```
$ spore memberships:revoke <THEIR_EMAIL>
```

Reverse of [`grant`](#grant), but it is instanteous. Remember to roll any sensitive keys that they had access to prior to revoking.

You can specify the directory of the app with `-d, --directory`, and the environment to revoke with `-e, --environment`.
You can also revoke to all environments with `-a, --all`.

#### Accept

```
$ spore memberhips:accept <YOUR_TOKEN>
```

Accept a memberhip. The token will be emailed to you when someone does a [`grant`](#grant).

You do not have to be in the app directory to accept membership.

#### List

```
$ spore memberships:list
```

Lists users with read access for an app.

You can specify the directory of the app with `-d, --directory`, and the environment to view users for with `-e, --environment`. You can also view users for all environments with `-a, --all`.


### Deployments

Deployments are non-human users (e.g. your application servers) that have access to a single app and environment.

#### Create

```
$ spore deployments:create [NAME]
```

Create a new deployment. This command will return an environment variable named `SPORE_DEPLOYMENT`. This is the
one environment variable you need to set on your server.

You can provide an optional name for your deployment. If one is not provided, the CLI will generate one for you.

You can specify the directory of the app with `-d, --directory`, and the environment to view users for with `-e, --environment`.

#### Remove

This hasn't been implemented yet. Pull Requests are welcome!

#### List

This hasn't been implemented yet. Pull Requests are welcome!


### Copy

```
$ spore copy <SOURCE_ENVIRONMENT>
```

Copies the keys from an environment to your default environment. Specify the target environment with the `-e, --environment` flag.

The `-p, --prompt` flag will prompt you for a value for each key in the source environment rather than copying over the values. This is the recommended usage for `copy`.

The `-d, --directory` flag lets you specify the app directory.

### Get

```
$ spore get [MY_VAR]
```

Displays the value of an environment variable in the default environment. If you omit the key, it will display
all of the variables in the default environment.

Use the `-e, --environment` option to specify the environment, or the `-a, --all` option to view values for all environments.

### Set

```
$ spore set <MY_VAR>
```

Set the value of a variable in the default environment. After executing, this command will listen to `stdin` for input
until a newline is encountered.

Use the `-e, --environment` option to specify the environment, or the `-a, --all` option to set the same value for all environments. Use the `-p, --prompt` option to be prompted for a different value for the key in every environment.


### Run

```
$ spore run <COMMAND>
```

Run a command with the Spore environment loaded.

Use the `-e, --environment` option to specify the environment, and the `-d, --directory` option to specify the app directory.

Refer to [Running An App](https://spore.sh/documentation#running-an-app) to see if there is a library for your
framework/language instead of using the CLI for this.

### Migrate

Migrations are CLI scripts to make migrating from another configuration management system to Spore as easy as possible.

#### Heroku

```
$ spore migrate:heroku <ENVIRONMENT>
```

Migrates the Heroku app in your current directory (as registered by git remote) to the specified environment.
To specify the Heroku app, use the `-a, --app` option (just like the `heroku` cli).

This is a non-desctructive action, it simply copies the environment variables in your heroku app to spore, and
sets the `SPORE_DEPLOYMENT` environment variable on Heroku.

While Heroku isn't a configuration management system per se, many people rely on it for their production and
staging application environments, which is why it's included here.

#### Others wanted

We'd love Pull Requests implementing migrations from your existing environment variable management tool to Spore.
Some examples of migrations we'd be particularly interested in are below:

- Figaro
- Dotenv
- Dotenv-node
