(function() {
  var fs, path, rbak;

  rbak = require('../build/index');

  fs = require('fs');

  path = require('path');

  exports.rbakTest = {
    test1: function(test) {
      test.expect(5);
      return rbak.backup({
        base: 'test/output',
        dir: 'test/input',
        ignore: 'node_modules,*.xml,file2*'
      }, function() {
        var backupFolder, backupFolders, outputFolder;
        outputFolder = path.join(process.cwd(), 'test', 'output');
        backupFolders = fs.readdirSync(outputFolder);
        backupFolder = path.join(outputFolder, backupFolders[0]);
        test.equal(fs.existsSync(path.join(backupFolder, 'file1.txt')), true, 'File Copy');
        test.equal(fs.existsSync(path.join(backupFolder, 'test-folder/folder-file.txt')), true, 'Folder Copy');
        test.equal(fs.existsSync(path.join(backupFolder, 'node_modules/node-file.js')), false, 'Ignore folder');
        test.equal(fs.existsSync(path.join(backupFolder, 'file2.bak')), false, 'Ignore filename');
        test.equal(fs.existsSync(path.join(backupFolder, 'file3.xml')), false, 'Ignore extension');
        return test.done();
      });
    }
  };

}).call(this);
