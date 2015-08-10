'use strict'

fs = require 'fs'
minimatch = require 'minimatch'
path = require 'path'
copy = new (require('task-copy'))
argv = require('minimist') process.argv.slice(2)
ignores = []
recursive = true
baseDir = ''
out = ''

iShouldBackupFile = (uri) ->
  fileIsGood = fs.lstatSync(uri).isFile()
  if not fileIsGood then return false
  for ignore in ignores
    if minimatch(uri, '**/' + ignore) then return false
  return true
  
iShouldBackupDirectory = (uri) ->
  directoryIsGood = fs.lstatSync(uri).isDirectory()
  if not directoryIsGood then return false
  for ignore in ignores
    if minimatch(uri, '**/' + ignore) then return false
  return true

backupDirectory = (dir) ->
  files = fs.readdirSync dir
  for file in files
    uri = path.join dir, file
    if iShouldBackupFile uri
      console.log 'copying', dir, file
      copy.run(uri, {dest:path.join(out, dir.replace(baseDir, ''), file)})
  for file in files
    uri = path.join dir, file
    if iShouldBackupDirectory uri
      backupDirectory uri
  #console.dir fs.lstatSync(path).isFile()
  
rbak = (args) ->
  dir = path.resolve (args?.dir or argv._[0] or process.cwd())
  baseDir = dir + ''
  out = path.resolve (args?.out or argv.out or process.cwd())
  ignores = (args?.ignores or args?.ignore or argv.ignores or argv.ignore or '').split /,/g
  if (args?.recursive or argv.recursive) is 'false' then recursive = false
  backupDirectory dir

if require.main is module
  rbak()
