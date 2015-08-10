'use strict'

module.exports = (grunt) ->
  require('load-grunt-tasks') grunt
  grunt.initConfig
    watch:
      coffee:
        files: ['src/**/*.coffee']
        tasks: ['coffee', 'file_append']
    coffee:
      main:
        cwd: 'src'
        dest: 'build'
        src: ['**/*.coffee']
        expand: true
        ext: '.js'
    file_append:
      main:
        files: [{
          prepend: '#!/usr/bin/env node\n//\'use strict\';\n'
          input: 'build/index.js'
          output: 'build/index.js'
        }]
  grunt.registerTask 'default', [
    'coffee'
    'file_append'
    'watch'
  ]