/*
filereader.js - a lightweight wrapper for common FileReader usage.
Open source code under MIT license: http://www.opensource.org/licenses/mit-license.php
Author: Brian Grinstead

See http://dev.w3.org/2006/webapi/FileAPI/#FileReader-interface for basic information
See http://dev.w3.org/2006/webapi/FileAPI/#event-summary for details on Options/on.* callbacks

Usage:
FileReaderJS.setupInput(input, opts);
FileReaderJS.setupDrop(element, opts); 

Options:
	readAs: 'ArrayBuffer' | 'BinaryString' | 'Text' | 'DataURL' (default)
	accept: A regex string to match the contenttype of a given file.
			For example: 'image/*' to only accept images.
			on.skip will be called when a file does not match the filter.
	dragClass: A CSS class to add onto the element called with setupDrop while dragging
	on: 
		loadstart: function(e) { }
		progress: function(e) { }
		load: function(e) { }
		abort: function(e) { }
		error: function(e) { }
		loadend: function(e) { }
		skip: function(file) { } Called only when a read has been skipped because of the accept string
*/

(function(global) {
	
	var FileReader = global.FileReader;
	var FileReaderJS = global.FileReaderJS = { 
		enabled: false,
		opts: {
			readAs: 'DataURL',
			dragClass: false,
			accept: false,
			on: {
				loadstart: noop,
				progress: noop,
				load: noop,
				abort: noop,
				error: noop,
				loadend: noop,
				skip: noop
			}
		}
	};
	
	if (!FileReader) {
		// Not all browsers support the FileReader interface.  Return with the enabled bit = false
		return;
	}
	
	FileReaderJS.enabled = true;
    FileReaderJS.setupInput = setupInput;
	FileReaderJS.setupDrop = setupDrop;
	var fileReaderEvents = ['loadstart', 'progress', 'load', 'abort', 'error', 'loadend'];
	
	function setupInput(input, opts) {
		var instanceOptions = extend(extend({}, FileReaderJS.opts), opts);
		
		input.addEventListener("change", inputChange, false);
		function inputChange(e) {
			handleFiles(e.target.files, instanceOptions);
		}
	}
	
	function setupDrop(dropbox, opts) {
		var instanceOptions = extend(extend({}, FileReaderJS.opts), opts),
			dragClass = opts.dragClass;
		
		dropbox.addEventListener("dragenter", dragenter, false);
		dropbox.addEventListener("dragleave", dragleave, false);
		dropbox.addEventListener("dragover", dragover, false);
		dropbox.addEventListener("drop", drop, false);
		
		function drop(e) {
			e.stopPropagation();
			e.preventDefault();
			if (dragClass) {
				removeClass(dropbox, dragClass);
			}
			handleFiles(e.dataTransfer.files, instanceOptions);
		}
		function dragenter(e) {
			if (dragClass) {
				addClass(dropbox, dragClass);
			}
			e.stopPropagation();
			e.preventDefault();
		}
		function dragleave(e) {
			if (dragClass) {
				removeClass(dropbox, dragClass);
			}
		}
		function dragover(e) {
			e.stopPropagation();
			e.preventDefault();
		}
	}

	function handleFiles(files, opts) {
		for (var i = 0; i < files.length; i++) {
			
			var file = files[i];
			if (opts.accept && !file.type.match(new RegExp(opts.accept))) {  
				opts.on.skip(file);
				continue;  
			}  
			
			var reader = new FileReader();
			
			for (var j = 0; j < fileReaderEvents.length; j++) {
				reader['on' + fileReaderEvents[j]] = opts.on[fileReaderEvents[j]];
			}
			
			reader['readAs' + opts.readAs](files[i]);
		}
	}
	
	
	
	// noop - A function that does nothing
	function noop() { 

	}
	
	// extend - used to make deep copies of options object
	function extend(destination, source) {
		for (var property in source) {
			if (source[property] && source[property].constructor &&
				source[property].constructor === Object) {
				destination[property] = destination[property] || {};
				arguments.callee(destination[property], source[property]);
			} 
			else {
				destination[property] = source[property];
			}
		}
		return destination;
	}
	
	// add/remove/has Class: basic class manipulation for drop zone
	function hasClass(ele,cls) {
		return ele.className.match(new RegExp('(\\s|^)'+cls+'(\\s|$)'));
	}
	function addClass(ele,cls) {
		if (!hasClass(ele,cls)) ele.className += " "+cls;
	}
	function removeClass(ele,cls) {
		if (hasClass(ele,cls)) {
			var reg = new RegExp('(\\s|^)'+cls+'(\\s|$)');
			ele.className=ele.className.replace(reg,' ');
		}
	}
	
})(this);
