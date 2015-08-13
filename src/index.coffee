'use strict'

fs = require 'fs'
mkdirp = require 'mkdirp'
minimatch = require 'minimatch'
path = require 'path'
dateFormatter = require 'date-format'
chalk = require 'chalk'
argv = require('minimist') process.argv.slice(2)
ignores = []
recursive = true
baseDir = ''
baseOut = ''
out = ''
respectGitignores = true
backupDirs = []

listBackedUpFiles = (dir, base) ->
  #work backwards through backupDirs
  output = {}
  if backupDirs
    for backupDir in backupDirs
      currentDir = path.join backupDir, dir.replace(base, '')
      if fs.existsSync currentDir
        files = fs.readdirSync currentDir
        for file in files
          fileStats = fs.lstatSync path.join(currentDir, file)
          deleted = false
          if file.match(/\.deleted$/)
            deleted = true
            file = file.replace /\.deleted$/, ''
          if not output[file]
            output[file] =
              backupDir: backupDir
              atime: fileStats.atime
              mtime: fileStats.mtime
              size: fileStats.size
              isFile: fileStats.isFile()
              isDirectory: fileStats.isDirectory()
              deleted: deleted
  return output


listBackupDirectories = (dir) ->
  output = []
  if fs.existsSync dir
    files = fs.readdirSync dir
    for file in files
      if file.length is 14 and file.replace(/\d/g, '') is ''
        if fs.lstatSync(path.join(dir,file)).isDirectory()
          output.push path.join(dir,file)
    output.sort()
    output.reverse()
  
      

readGitignore = (dir) ->
  ignorePath = path.join dir, '.gitignore'
  localIgnores = []
  if fs.existsSync ignorePath
    if fs.lstatSync(ignorePath).isFile()
      data = fs.readFileSync ignorePath,
        encoding: 'utf8'
      if data
        lines = data.split /\n/g
        for line in lines
          line = line.replace /\s/g, ''
          if line and line.length and line.indexOf('#') isnt 0
            localIgnores.push line
  return localIgnores

iShouldBackupFile = (uri, file, localIgnores, backedUpFiles) ->
  fileStats = fs.lstatSync uri
  fileIsGood = fileStats.isFile()
  if not fileIsGood then return false
  for ignore in ignores
    if minimatch(uri, '**/' + ignore) then return false
  for ignore in localIgnores
    if minimatch(uri, '**/' + ignore) then return false
    if minimatch(uri, ignore) then return false
    if minimatch(file, ignore) then return false
  backup = backedUpFiles[file]
  if backup and backup.isFile and  backup.mtime + '' is fileStats.mtime + '' and not backup.deleted
    return false
  return true
  
iShouldBackupDirectory = (uri, file, localIgnores, backedUpFiles) ->
  if not recursive then return false
  fileStats = fs.lstatSync uri
  directoryIsGood = fileStats.isDirectory()
  if not directoryIsGood then return false
  for ignore in ignores
    if minimatch(uri, '**/' + ignore) then return false
    if minimatch(uri, ignore) then return false
    if minimatch(file, ignore) then return false
  for ignore in localIgnores
    if minimatch(uri, '**/' + ignore) then return false
    if minimatch(uri, ignore) then return false
    if minimatch(file, ignore) then return false
  backup = backedUpFiles[file]
  if backup and backup.isDirectory and backup.mtime + '' is fileStats.mtime + '' and not backup.deleted
    return false
  return true

backupDirectory = (dir, localIgnores) ->
  if respectGitignores
    localIgnores = readGitignore(dir) or localIgnores
  backedUpFiles = listBackedUpFiles dir, baseDir
  destDir = path.join out, dir.replace(baseDir, '')
  console.log dir
  files = fs.readdirSync dir
  for file in files
    uri = path.join dir, file
    if iShouldBackupFile uri, file, localIgnores, backedUpFiles
      #console.log 'writing file', file
      dest = path.join destDir, file
      if not fs.existsSync(destDir) then mkdirp.sync(destDir)
      fs.writeFileSync dest, fs.readFileSync(uri, 'binary'), 'binary'
      fileStats = fs.lstatSync uri
      fs.utimesSync dest, fileStats.atime, fileStats.mtime
  for file in files
    uri = path.join dir, file
    if iShouldBackupDirectory uri, file, localIgnores, backedUpFiles
      #process.stdout.write uri + '\r'
      backupDirectory uri, localIgnores
  for own file, fileStats of backedUpFiles
    uri = path.join dir, file
    if not fileStats.deleted and not fs.existsSync(uri)
      if not fs.existsSync(destDir) then mkdirp.sync(destDir)
      if fileStats.isFile
        fs.writeFileSync path.join(destDir, file + '.deleted'), 'deleted'
      else
        mkdirp.sync path.join(destDir, file + '.deleted')
        
restoreDirectory = (dir, out) ->
  backedUpFiles = listBackedUpFiles dir
  destDir = path.join out, dir.replace(baseDir, '')
  for file, fileStats of backedUpFiles
    if not fileStats.deleted and fileStats.isFile
      uri = path.join fileStats.backupDir, dir, file
      dest = path.join destDir, file
      if not fs.existsSync(destDir) then mkdirp.sync(destDir)
      fs.writeFileSync dest, fs.readFileSync(uri, 'binary'), 'binary'
      console.log 'Written file', dest
  if recursive
    for file, fileStats of backedUpFiles
      if not fileStats.deleted and fileStats.isDirectory
        restoreDirectory dir + '/' + file, out

listDirectory = (dir) ->
  backedUpFiles = listBackedUpFiles dir
  for file, fileStats of backedUpFiles
    if not fileStats.deleted and fileStats.isDirectory
      console.log chalk.yellow.bold('  [DIR]', file)
  for file, fileStats of backedUpFiles
    if not fileStats.deleted and fileStats.isFile
      console.log chalk.green.bold('  ' + file)
  
rbak = (args, command) ->
  command = command or argv._[0] or 'backup'
  if command is 'help' or argv.help
    console.log ''
    console.log chalk.yellow.bold('usage')
    console.log ''
    console.log 'rbak [command] [options]'
    console.log ''
    console.log chalk.yellow.bold('available commands')
    console.log ''
    console.log chalk.green.bold('backup') + ' - backup a directory'
    console.log chalk.green.bold('list') + ' - list the contents of a backed up directory'
    console.log chalk.green.bold('restore') + ' - restore a directory'
    console.log ''
    console.log chalk.yellow.bold('options')
    console.log ''
    console.log chalk.green.bold('--base') + ' - the location of your backup'
    console.log chalk.green.bold('--dir') + ' - the directory you want to backup, list or restore'
    console.log chalk.green.bold('--ignore') + ' - a comma seperated list of files/folders to globally ignore'
    console.log chalk.green.bold('--recursive') + ' - recursively back up folders? true/false'
    console.log chalk.green.bold('--respect-gitignore') + ' - respect local .gitignores? true/false'
    return false
  dir = args?.dir or argv.dir or (if command is 'backup' then process.cwd() else '')
  baseDir = baseOut = out = ''
  if command is 'backup'
    dir = path.resolve dir
    baseOut = path.resolve (args?.out or args?.base or argv.out or argv.base or process.cwd())
    if dir is baseOut
      console.log chalk.red.bold('Cannot backup into the folder you are backing up from')
      return false
    out = path.join(baseOut, dateFormatter('yyyyMMddhhmmss', new Date()))
  else
    baseOut = path.resolve (args?.base or argv.base or process.cwd())
    out = path.resolve (args?.out or argv.out or '')
  baseDir = dir + ''
  ignores = (args?.ignores or args?.ignore or argv.ignores or argv.ignore or '').split /,/g
  if (args?.recursive or argv.recursive) is 'false' then recursive = false
  if (args?['respect-gitignores'] or argv['respect-gitignores']) is 'false' then respectGitignores = false
  backupDirs = listBackupDirectories baseOut
  if command isnt 'backup' and not backupDirs.length
    console.log 'Cannot find backup.  Make sure ' + chalk.green.bold('--base') + ' is set correctly'
    return false
  switch command
    when 'backup' then backupDirectory dir, []
    when 'list', 'ls', 'dir' then listDirectory dir
    when 'restore' then restoreDirectory dir, out
    else console.log 'Command not recognized'

if require.main is module
  rbak()

module.exports = 
  backup: (args) ->
    rbak args, 'backup'
  list: (args) ->
    rbak args, 'list'
  restore: (args) ->
    rbak args, 'restore'