'use strict'

module.exports = (grunt) ->
  require('load-grunt-tasks') grunt
  grunt.initConfig
    watch:
      coffee:
        files: ['src/**/*.coffee', 'test/**/*.coffee']
        tasks: ['coffee', 'file_append']
    coffee:
      main:
        files: [{
          cwd: 'src'
          dest: 'build'
          src: ['**/*.coffee']
          expand: true
          ext: '.js'
        }
        {
          cwd: 'test'
          dest: 'test'
          src: ['**/*.coffee']
          expand: true
          ext: '.js'
        }]
    coffeelint:
      main:
        files:
          src: [
            'src/**/*.coffee'
            'test/**/*.coffee'
            'Gruntfile.coffee'
          ]
        options:
          'no_trailing_whitespace': level: 'ignore'
          'max_line_length': level: 'ignore'
    file_append:
      main:
        files: [{
          prepend: '#!/usr/bin/env node\n//\'use strict\';\n'
          input: 'build/index.js'
          output: 'build/index.js'
        }]
    nodeunit:
      tests: ['test/test*.js']
    clean:
      tests: ['test/output']
  grunt.registerTask 'default', [
    'coffee'
    'file_append'
    'watch'
  ]
  grunt.registerTask 'test', [
    'clean'
    'coffeelint'
    'coffee'
    'file_append'
    'nodeunit'
  ]