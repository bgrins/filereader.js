# FileReader.js

http://bgrins.github.com/filereader.js/

A small library independant wrapper for the JavaScript FileReader interface.

This plugin is open source under the MIT License.  It was developed in conjunction with a CSS sprite generator project: http://instantsprite.com.

## Specifications
* See http://www.w3.org/TR/FileAPI/#dfn-filereader to read about FileReader.
* See http://www.w3.org/TR/FileAPI/#FileReaderSync to read about FileReaderSync.
* See http://www.w3.org/TR/FileAPI/#event-handler-attributes-section for details on Options/on.* callbacks.

## Usage:
	FileReaderJS.setupInput(document.getElementById('file-input'), opts);
	FileReaderJS.setupDrop(document.getElementById('dropzone'), opts);
	FileReaderJS.setupClipboard(document.body, opts);

## If you have jQuery:
	$("#file-input, #dropzone").fileReaderJS(opts);
	$("body").fileClipboard(opts);

## FileReaderJS.sync

Use the `FileReaderSync` object when available to load the files in a separate worker.  `false` by default.  This will cause only the `load` or `error` events to fire (there will be none of the other ProgressEvents, as the operation is synchronous).

## Options

	readAsMap: A collection taking key as a string that will be matched with regex against
		file types and the type to read as.  If no match is found, it will use readAsDefault.
		The default map is:
		{
			'image/*': 'DataURL',
			'text/*' : 'Text'
		}
	readAsDefault: 'ArrayBuffer' | 'Text' | 'DataURL' (default)
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
		beforestart: function(file) { } Called before a file is passed to the FileReader.  Return false to prevent processing.  This is used along with the 'accept' parameter to skip a file (ex: an image is too big to process).  This wouldn't be needed, except that Chrome sometimes crashes when calling abort(): http://code.google.com/p/chromium/issues/detail?id=60979
		skip: function(file) { } Called only when a read has been skipped because of the accept string
		groupstart: function(group) { }
		groupend: function(group) { }

## Parameters to events:

	e - the native ProgressEvent created by the FileReader

	file - an extension of the original File object.  See W3 link above for all native parameters.  Here are the extra fields

	file.extra = {
		fileID: a generated int id for this file.
		groupID: the group that it belongs to
		nameNoExtension: 'myImage' instead of 'myImage.png'
		extension: 'png' instead of 'myImage.png'
		prettySize: '46.47' kb instead of 47585 (size field)
	}

	group: simple grouping of files.  Each time a change event or drop even happens and a FileList is created, and all of these files are stored inside a group object.

		groupID: a generated int id for this group
		files: the FileList associated with the group
		started: the Date the group was recieved as input
		ended: the Date all files in the group finished loading

Any contributions are welcome.
Author: Brian Grinstead.

