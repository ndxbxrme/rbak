#!/usr/bin/env node
//'use strict';
(function() {
  'use strict';
  var argv, backupDirectory, backupDirs, baseDir, baseOut, chalk, dateFormatter, fs, iShouldBackupDirectory, iShouldBackupFile, ignores, listBackedUpFiles, listBackupDirectories, listDirectory, minimatch, mkdirp, out, path, rbak, readGitignore, recursive, respectGitignores, restoreDirectory,
    hasProp = {}.hasOwnProperty;

  fs = require('fs');

  mkdirp = require('mkdirp');

  minimatch = require('minimatch');

  path = require('path');

  dateFormatter = require('date-format');

  chalk = require('chalk');

  argv = require('minimist')(process.argv.slice(2));

  ignores = [];

  recursive = true;

  baseDir = '';

  baseOut = '';

  out = '';

  respectGitignores = true;

  backupDirs = [];

  listBackedUpFiles = function(dir, base) {
    var backupDir, currentDir, deleted, file, fileStats, files, i, j, len, len1, output;
    output = {};
    if (backupDirs) {
      for (i = 0, len = backupDirs.length; i < len; i++) {
        backupDir = backupDirs[i];
        currentDir = path.join(backupDir, dir.replace(base, ''));
        if (fs.existsSync(currentDir)) {
          files = fs.readdirSync(currentDir);
          for (j = 0, len1 = files.length; j < len1; j++) {
            file = files[j];
            fileStats = fs.lstatSync(path.join(currentDir, file));
            deleted = false;
            if (file.match(/\.deleted$/)) {
              deleted = true;
              file = file.replace(/\.deleted$/, '');
            }
            if (!output[file]) {
              output[file] = {
                backupDir: backupDir,
                atime: fileStats.atime,
                mtime: fileStats.mtime,
                size: fileStats.size,
                isFile: fileStats.isFile(),
                isDirectory: fileStats.isDirectory(),
                deleted: deleted
              };
            }
          }
        }
      }
    }
    return output;
  };

  listBackupDirectories = function(dir) {
    var file, files, i, len, output;
    output = [];
    if (fs.existsSync(dir)) {
      files = fs.readdirSync(dir);
      for (i = 0, len = files.length; i < len; i++) {
        file = files[i];
        if (file.length === 14 && file.replace(/\d/g, '') === '') {
          if (fs.lstatSync(path.join(dir, file)).isDirectory()) {
            output.push(path.join(dir, file));
          }
        }
      }
      output.sort();
      return output.reverse();
    }
  };

  readGitignore = function(dir) {
    var data, i, ignorePath, len, line, lines, localIgnores;
    ignorePath = path.join(dir, '.gitignore');
    localIgnores = [];
    if (fs.existsSync(ignorePath)) {
      if (fs.lstatSync(ignorePath).isFile()) {
        data = fs.readFileSync(ignorePath, {
          encoding: 'utf8'
        });
        if (data) {
          lines = data.split(/\n/g);
          for (i = 0, len = lines.length; i < len; i++) {
            line = lines[i];
            line = line.replace(/\s/g, '');
            if (line && line.length && line.indexOf('#') !== 0) {
              localIgnores.push(line);
            }
          }
        }
      }
    }
    return localIgnores;
  };

  iShouldBackupFile = function(uri, file, localIgnores, backedUpFiles) {
    var backup, fileIsGood, fileStats, i, ignore, j, len, len1;
    fileStats = fs.lstatSync(uri);
    fileIsGood = fileStats.isFile();
    if (!fileIsGood) {
      return false;
    }
    for (i = 0, len = ignores.length; i < len; i++) {
      ignore = ignores[i];
      if (minimatch(uri, '**/' + ignore)) {
        return false;
      }
    }
    for (j = 0, len1 = localIgnores.length; j < len1; j++) {
      ignore = localIgnores[j];
      if (minimatch(uri, '**/' + ignore)) {
        return false;
      }
      if (minimatch(uri, ignore)) {
        return false;
      }
      if (minimatch(file, ignore)) {
        return false;
      }
    }
    backup = backedUpFiles[file];
    if (backup && backup.isFile && backup.mtime + '' === fileStats.mtime + '' && !backup.deleted) {
      return false;
    }
    return true;
  };

  iShouldBackupDirectory = function(uri, file, localIgnores, backedUpFiles) {
    var backup, directoryIsGood, fileStats, i, ignore, j, len, len1;
    if (!recursive) {
      return false;
    }
    fileStats = fs.lstatSync(uri);
    directoryIsGood = fileStats.isDirectory();
    if (!directoryIsGood) {
      return false;
    }
    for (i = 0, len = ignores.length; i < len; i++) {
      ignore = ignores[i];
      if (minimatch(uri, '**/' + ignore)) {
        return false;
      }
      if (minimatch(uri, ignore)) {
        return false;
      }
      if (minimatch(file, ignore)) {
        return false;
      }
    }
    for (j = 0, len1 = localIgnores.length; j < len1; j++) {
      ignore = localIgnores[j];
      if (minimatch(uri, '**/' + ignore)) {
        return false;
      }
      if (minimatch(uri, ignore)) {
        return false;
      }
      if (minimatch(file, ignore)) {
        return false;
      }
    }
    backup = backedUpFiles[file];
    if (backup && backup.isDirectory && backup.mtime + '' === fileStats.mtime + '' && !backup.deleted) {
      return false;
    }
    return true;
  };

  backupDirectory = function(dir, localIgnores) {
    var backedUpFiles, dest, destDir, file, fileStats, files, i, j, len, len1, results, uri;
    if (respectGitignores) {
      localIgnores = readGitignore(dir) || localIgnores;
    }
    backedUpFiles = listBackedUpFiles(dir, baseDir);
    destDir = path.join(out, dir.replace(baseDir, ''));
    console.log(dir);
    files = fs.readdirSync(dir);
    for (i = 0, len = files.length; i < len; i++) {
      file = files[i];
      uri = path.join(dir, file);
      if (iShouldBackupFile(uri, file, localIgnores, backedUpFiles)) {
        dest = path.join(destDir, file);
        if (!fs.existsSync(destDir)) {
          mkdirp.sync(destDir);
        }
        fs.writeFileSync(dest, fs.readFileSync(uri, 'binary'), 'binary');
        fileStats = fs.lstatSync(uri);
        fs.utimesSync(dest, fileStats.atime, fileStats.mtime);
      }
    }
    for (j = 0, len1 = files.length; j < len1; j++) {
      file = files[j];
      uri = path.join(dir, file);
      if (iShouldBackupDirectory(uri, file, localIgnores, backedUpFiles)) {
        backupDirectory(uri, localIgnores);
      }
    }
    results = [];
    for (file in backedUpFiles) {
      if (!hasProp.call(backedUpFiles, file)) continue;
      fileStats = backedUpFiles[file];
      uri = path.join(dir, file);
      if (!fileStats.deleted && !fs.existsSync(uri)) {
        if (!fs.existsSync(destDir)) {
          mkdirp.sync(destDir);
        }
        if (fileStats.isFile) {
          results.push(fs.writeFileSync(path.join(destDir, file + '.deleted'), 'deleted'));
        } else {
          results.push(mkdirp.sync(path.join(destDir, file + '.deleted')));
        }
      } else {
        results.push(void 0);
      }
    }
    return results;
  };

  restoreDirectory = function(dir, out) {
    var backedUpFiles, dest, destDir, file, fileStats, results, uri;
    backedUpFiles = listBackedUpFiles(dir);
    destDir = path.join(out, dir.replace(baseDir, ''));
    for (file in backedUpFiles) {
      fileStats = backedUpFiles[file];
      if (!fileStats.deleted && fileStats.isFile) {
        uri = path.join(fileStats.backupDir, dir, file);
        dest = path.join(destDir, file);
        if (!fs.existsSync(destDir)) {
          mkdirp.sync(destDir);
        }
        fs.writeFileSync(dest, fs.readFileSync(uri, 'binary'), 'binary');
        console.log('Written file', dest);
      }
    }
    if (recursive) {
      results = [];
      for (file in backedUpFiles) {
        fileStats = backedUpFiles[file];
        if (!fileStats.deleted && fileStats.isDirectory) {
          results.push(restoreDirectory(dir + '/' + file, out));
        } else {
          results.push(void 0);
        }
      }
      return results;
    }
  };

  listDirectory = function(dir) {
    var backedUpFiles, file, fileStats, results;
    backedUpFiles = listBackedUpFiles(dir);
    for (file in backedUpFiles) {
      fileStats = backedUpFiles[file];
      if (!fileStats.deleted && fileStats.isDirectory) {
        console.log(chalk.yellow.bold('  [DIR]', file));
      }
    }
    results = [];
    for (file in backedUpFiles) {
      fileStats = backedUpFiles[file];
      if (!fileStats.deleted && fileStats.isFile) {
        results.push(console.log(chalk.green.bold('  ' + file)));
      } else {
        results.push(void 0);
      }
    }
    return results;
  };

  rbak = function(args, command) {
    var dir;
    command = command || argv._[0] || 'backup';
    if (command === 'help' || argv.help) {
      console.log('');
      console.log(chalk.yellow.bold('usage'));
      console.log('');
      console.log('rbak [command] [options]');
      console.log('');
      console.log(chalk.yellow.bold('available commands'));
      console.log('');
      console.log(chalk.green.bold('backup') + ' - backup a directory');
      console.log(chalk.green.bold('list') + ' - list the contents of a backed up directory');
      console.log(chalk.green.bold('restore') + ' - restore a directory');
      console.log('');
      console.log(chalk.yellow.bold('options'));
      console.log('');
      console.log(chalk.green.bold('--base') + ' - the location of your backup');
      console.log(chalk.green.bold('--dir') + ' - the directory you want to backup, list or restore');
      console.log(chalk.green.bold('--ignore') + ' - a comma seperated list of files/folders to globally ignore');
      console.log(chalk.green.bold('--recursive') + ' - recursively back up folders? true/false');
      console.log(chalk.green.bold('--respect-gitignore') + ' - respect local .gitignores? true/false');
      return false;
    }
    dir = (args != null ? args.dir : void 0) || argv.dir || (command === 'backup' ? process.cwd() : '');
    baseDir = baseOut = out = '';
    if (command === 'backup') {
      dir = path.resolve(dir);
      baseOut = path.resolve((args != null ? args.out : void 0) || (args != null ? args.base : void 0) || argv.out || argv.base || process.cwd());
      if (dir === baseOut) {
        console.log(chalk.red.bold('Cannot backup into the folder you are backing up from'));
        return false;
      }
      out = path.join(baseOut, dateFormatter('yyyyMMddhhmmss', new Date()));
    } else {
      baseOut = path.resolve((args != null ? args.base : void 0) || argv.base || process.cwd());
      out = path.resolve((args != null ? args.out : void 0) || argv.out || '');
    }
    baseDir = dir + '';
    ignores = ((args != null ? args.ignores : void 0) || (args != null ? args.ignore : void 0) || argv.ignores || argv.ignore || '').split(/,/g);
    if (((args != null ? args.recursive : void 0) || argv.recursive) === 'false') {
      recursive = false;
    }
    if (((args != null ? args['respect-gitignores'] : void 0) || argv['respect-gitignores']) === 'false') {
      respectGitignores = false;
    }
    backupDirs = listBackupDirectories(baseOut);
    if (command !== 'backup' && !backupDirs.length) {
      console.log('Cannot find backup.  Make sure ' + chalk.green.bold('--base') + ' is set correctly');
      return false;
    }
    switch (command) {
      case 'backup':
        return backupDirectory(dir, []);
      case 'list':
      case 'ls':
      case 'dir':
        return listDirectory(dir);
      case 'restore':
        return restoreDirectory(dir, out);
      default:
        return console.log('Command not recognized');
    }
  };

  if (require.main === module) {
    rbak();
  }

  module.exports = {
    backup: function(args) {
      return rbak(args, 'backup');
    },
    list: function(args) {
      return rbak(args, 'list');
    },
    restore: function(args) {
      return rbak(args, 'restore');
    }
  };

}).call(this);
