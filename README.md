# rbak [![Build Status](https://travis-ci.org/ndxbxrme/rbak.svg?branch=master)](https://travis-ci.org/ndxbxrme/rbak)
## backup your files, respecting .gitignores

Rbak is a cumulative, time-based backup thingy which respects .gitignores so you don't end up with `node_modules` folders all over the place.

Can be used globally or reuired as a module

## Installing
*Stand alone*
```sh
npm install -g rbak
```
*As a module*
```sh
npm install --save rbak
```

## Usage
*Stand alone*
```sh
rbak [command] [options]
```
*As a module*
```js
var rbak = require('rbak');

rbak.[command]({
  [options]
});
```

## Commands
`backup`  
`list`  
`restore`  

## Options
`--base` - Where your backup lives  
`--dir` - Directory to backup or directory in backup to list/restore  
`--ignore` - Comma seperated list of files/directories to ignore globally  
`--recursive` - true/false, defaults to true  
`--respect-gitignore` - true/false, defaults to true  

## Examples
Backup `DEV` dir into a folder called `backup` ignoring a bunch of files
```sh
rbak backup --dir=DEV --base=backup --ignore=node_modules,.git,bower_components,.svn,*.exe,*.bin,*.dat,*.log,*.0,*.bvh,*.ddp,
Unreal*
```
List contents of a backed up folder
```sh
rbak list --base=D:/backup --dir=github/rbak
```
Restore files from a backed up folder
```sh
rbak restore --base=D:/backup --dir=github/rbak --out=D:/rbak
```

## Known issues
* Gets upset about really big files, make sure you ignore them
