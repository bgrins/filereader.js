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
		loadstart: function(e, file) { }
		progress: function(e, file) { }
		load: function(e, file) { }
		abort: function(e, file) { }
		error: function(e, file) { }
		loadend: function(e, file) { }
		skip: function(file) { } Called only when a read has been skipped because of the accept string
		groupstart: function(groupID, files) { } 
		groupend: function(groupID, files) { } 
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
				skip: noop,
				groupstart: noop,
				groupend: noop
			}
		}
	};
	var fileReaderEvents = ['loadstart', 'progress', 'load', 'abort', 'error', 'loadend'];
	
	if (!FileReader) {
		// Not all browsers support the FileReader interface.  Return with the enabled bit = false
		return;
	}
	
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

	// Modify the file object with convenience properties
	function setupCustomFileProperties(files, groupID) {
		for (var i = 0; i < files.length; i++) {
			var file = files[i];
			file.nameNoExtension = file.name.substring(0, file.name.lastIndexOf('.'));
			file.extension = file.name.substring(file.name.lastIndexOf('.') + 1);
			file.id = getFileID();	
			file.groupID = groupID;
			file.prettySize = prettySize(file.size);
		}
	}
	
	function handleFiles(files, opts) {
	
		var groupID = getGroupID(),
			groupLength = groupFilesLeft = files.length,
			groupFileDone = function() {
				if (--groupFilesLeft == 0) {
				    opts.on.groupend(groupID, files);
				}
			};
			
		setupCustomFileProperties(files, groupID);
		
		opts.on.groupstart(groupID, files);
		if (!groupLength) {
			opts.on.groupend(groupID, files);
		}
		
		for (var i = 0; i < files.length; i++) {
			
			var file = files[i];
			if (opts.accept && !file.type.match(new RegExp(opts.accept))) {  
				opts.on.skip(file);
				continue;  
			}  
			
			var reader = new FileReader();
			
			for (var j = 0; j < fileReaderEvents.length; j++) {
				var eventName = fileReaderEvents[j];
				
				// bind to a self executing function that returns a function that
				// passes the file along to the callback, so we have access to the file
				// from the ProgressEvent.  Need to keep scope for current file and eventName
				reader['on' + eventName] = (function(eventName, file) {
					return function(e) {
						if (eventName == 'loadend') {
							groupFileDone();
						}
						opts.on[eventName](e, file);
					};
				})(eventName, file);
			}
			
			reader['readAs' + opts.readAs](file);
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
	
	// prettySize: convert bytes to a more readable string
	function prettySize(bytes) {
		var s = ['bytes', 'kb', 'MB', 'GB', 'TB', 'PB'];
		var e = Math.floor(Math.log(bytes)/Math.log(1024));
		return (bytes/Math.pow(1024, Math.floor(e))).toFixed(2)+" "+s[e];
	}
	
	var getGroupID = (function() {
		var id = 0;
		return function() {
			return id++;
		}
	})();
	
	var getFileID = (function() {
		var id = 0;
		return function() {
			return id++;
		}
	})();
	
	// The interface is supported, bind the FileReaderJS callbacks
	FileReaderJS.enabled = true;
	FileReaderJS.setupInput = setupInput;
	FileReaderJS.setupDrop = setupDrop;
	
})(this);
