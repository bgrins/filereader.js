/*global module:false*/
var exec = require('child_process').exec;

module.exports = function(grunt) {

  grunt.initConfig({
    meta: {
      version: '0.9',
      banner:   '/*!\n' +
                '    FileReader.js - a lightweight wrapper for common FileReader usage.\n' +
                '    Copyright <%= grunt.template.today("yyyy") %> Brian Grinstead - MIT License.\n' +
                '    See http://github.com/bgrins/filereader.js for documentation.\n' +
                '    Built: <%= grunt.template.today("yyyy-mm-dd at hh:mm:ss") %>\n' +
                '*/\n'
    },
    min: {
      dist: {
        src: ['<banner:meta.banner>', 'filereader.js'],
        dest: 'filereader.min.js'
      }
    },
    uglify: {}
  });

  grunt.registerTask('docs', 'Process Annotated Source.', function() {
    var done = this.async();
    exec("docco filereader.js", function() {
      done();
    });
  });

  grunt.registerTask('default', 'min docs');
};
