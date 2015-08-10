#!/usr/bin/env node
//'use strict';
(function() {
  'use strict';
  var argv, backupDirectory, baseDir, copy, fs, iShouldBackupDirectory, iShouldBackupFile, ignores, minimatch, out, path, rbak, recursive;

  fs = require('fs');

  minimatch = require('minimatch');

  path = require('path');

  copy = new (require('task-copy'));

  argv = require('minimist')(process.argv.slice(2));

  ignores = [];

  recursive = true;

  baseDir = '';

  out = '';

  iShouldBackupFile = function(uri) {
    var fileIsGood, i, ignore, len;
    fileIsGood = fs.lstatSync(uri).isFile();
    if (!fileIsGood) {
      return false;
    }
    for (i = 0, len = ignores.length; i < len; i++) {
      ignore = ignores[i];
      if (minimatch(uri, '**/' + ignore)) {
        return false;
      }
    }
    return true;
  };

  iShouldBackupDirectory = function(uri) {
    var directoryIsGood, i, ignore, len;
    directoryIsGood = fs.lstatSync(uri).isDirectory();
    if (!directoryIsGood) {
      return false;
    }
    for (i = 0, len = ignores.length; i < len; i++) {
      ignore = ignores[i];
      if (minimatch(uri, '**/' + ignore)) {
        return false;
      }
    }
    return true;
  };

  backupDirectory = function(dir) {
    var file, files, i, j, len, len1, results, uri;
    files = fs.readdirSync(dir);
    for (i = 0, len = files.length; i < len; i++) {
      file = files[i];
      uri = path.join(dir, file);
      if (iShouldBackupFile(uri)) {
        console.log('copying', dir, file);
        copy.run(uri, {
          dest: path.join(out, dir.replace(baseDir, ''), file)
        });
      }
    }
    results = [];
    for (j = 0, len1 = files.length; j < len1; j++) {
      file = files[j];
      uri = path.join(dir, file);
      if (iShouldBackupDirectory(uri)) {
        results.push(backupDirectory(uri));
      } else {
        results.push(void 0);
      }
    }
    return results;
  };

  rbak = function(args) {
    var dir;
    dir = path.resolve((args != null ? args.dir : void 0) || argv._[0] || process.cwd());
    baseDir = dir + '';
    out = path.resolve((args != null ? args.out : void 0) || argv.out || process.cwd());
    ignores = ((args != null ? args.ignores : void 0) || (args != null ? args.ignore : void 0) || argv.ignores || argv.ignore || '').split(/,/g);
    if (((args != null ? args.recursive : void 0) || argv.recursive) === 'false') {
      recursive = false;
    }
    return backupDirectory(dir);
  };

  if (require.main === module) {
    rbak();
  }

}).call(this);
