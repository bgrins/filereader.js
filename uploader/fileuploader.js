/*
fileuploader.js - a plugin for FormData file uploads
Open source code under MIT license: http://www.opensource.org/licenses/mit-license.php
Author: Brian Grinstead

See http://github.com/bgrins/filereader.js for documentation
*/


(function(global) {

global.FileUploader = uploader;
global.FileUploader.doUpload = doUpload;
global.FileUploader.opts = {
	thumbnail: [50, 50],
	dragClass: 'drag',
	outputClass: 'file-list',
	fileinput: 'file-input',
	dropzone: 'dropzone',
	debug: true,
	maxSize: 512000,
	errors: {
		fileTooLarge: '{filename} is too large.'
	}
};

function uploader(form, opts) {

	var o = $.extend({}, global.FileUploader.opts, opts);
	o.url = $(form).attr("action");
	
	var fileinput = $(form).find("#" + o.fileinput);
	var dropzone = $(form).find("#" + o.dropzone);
	var filelist = $("<ul class='file-list'></ul>").appendTo(form);
	
	
	log("creating uploader", form, o);
	
	$(filelist).delegate(".details", "click", function() { 
		$(this).closest("li").find("pre").toggle('fast');
		return false;
	});
	
	$(filelist).delegate(".send", "click", function() {
		var li = $(this).closest("li");
		var fileID = parseInt(li.attr("data-fileid"), 10);
		var groupID = parseInt(li.attr("data-groupid"), 10);
		
		var file = FileReaderJS.output[groupID].files[fileID];
		
		if (file.size < o.maxSize) {
			sendFile(file, li);
		}
		else {
			li.append(o.errors.fileTooLarge.replace("{filename}", file.name));
		}
		
		return false;
	});
	
	
	var opts = {
		dragClass: o.dragClass,
		readAsMap: {
		
		},
		on: {
			load: function(e, file) {
				var fileDiv = $("#group_" + file.extra.groupID + "_file_" + file.extra.fileID).addClass("done");
				
				// Create a thumbnail and add it to the output if it is an image
					var img = new Image();
					img.onload = function() {
						fileDiv.append(getThumbnail(img, o.thumbnail[0], o.thumbnail[1]));
					};
					img.src = e.target.result;
			},
			beforestart: function(file) {
				// only read images
				return (file.type.indexOf("image/") != -1) && (file.size < o.maxSize);
			},
			groupstart: function(group) {
				log("Starting", group.files);
				$(filelist).append(groupTemplate(group.groupID, group.files));
			},
			groupend: function(group) {
				$("#group_" + group.groupID).append(
					"(Time to load: " + (group.ended - group.started) + "ms)"
				);
			}
		}
	};
	
	
	function sendFile(file, li) {
		var sendMessage = li.find(".send");
		sendMessage.html("Uploading...");
	
		var uploadopts = {
			data: {
				"name": "value"
			},
			url: o.url,
			onload: function(e) {
				log("loaded", e);
				sendMessage.html("Done!");
			},
			onprogress: function(e, file, percentage) {
				li.find(".progress div").css("width", percentage + "%");
			},
			onerror: function(e) {
				log("error", e);
				sendMessage.html("Error!");
			}
		};
	
		doUpload(file, uploadopts);
	}
	
	function log() {
		if (o.debug && console) { console.log(Array.prototype.slice.call(arguments)); }
	};

	FileReaderJS.setupInput(fileinput[0], opts);
	FileReaderJS.setupDrop(dropzone[0], opts);
}

function groupTemplate(groupID, files) {
	var html = [];
	for (var i = 0; i < files.length; i++) {
		var file = files[i];
		var id = "group_" + groupID + "_file_" + file.extra.fileID;
		
		html.push(
			"<li id='" + id + "' data-fileid='" + file.extra.fileID + "' data-groupid='"+groupID+"'>" + 
				"<span class='filename'>" + file.name + "</span> " +
				"<span class='details'><a href='#'>(show details)</a></span> " +
				"<span class='send'><a href='#'>upload to server</a></span>" +
				"<pre>" + JSON.stringify(file, null, '\t') + "</pre>" +
				"<div class='progress'><div></div></div>" +
			"</li>"
		);
	}
	
	var start = "<li id='group_" + groupID + "' class='group'>Group: " + groupID + " (" + files.length + " files) </li>";
	
	return  start + html.join('');
}

function getThumbnail(img, maxWidth, maxHeight) {
	var canvas = document.createElement("canvas");
	var ctx = canvas.getContext("2d");
	
	var ratio = 1;
	if (img.width > maxWidth) {
	    ratio = maxWidth / img.width;
	}
	if ((img.height * ratio) > maxHeight) {
	    ratio = maxHeight / img.height;
	}
	canvas.width = img.width * ratio;
	canvas.height = img.height * ratio;
	
	ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
	return canvas;
}
	
function doUpload(file, opts) {
    
    // Default option callbacks
    opts = opts || { };
    opts.onprogress = opts.onprogress || function() { };
    opts.onerror = opts.onerror || function() { };
    opts.onload = opts.onload || function() { };
    opts.url = opts.url || "upload.php";
    opts.data = opts.data || { };
    opts.fileInputName = opts.fileInputName || "file";
    
    
    // Generate FormData object
    var fd = new FormData();
    for (var d in opts.data) { fd.append(d, opts.data[d]); }
    fd.append(opts.fileInputName, file);
    
    // Send off request
    var xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", onprogress, false);
    xhr.upload.addEventListener("load", onload, false);
    xhr.upload.addEventListener("error", onerror, false);
    xhr.open("POST", opts.url);
    xhr.send(fd);
    
    
    function onprogress(e) {
    	if (e.lengthComputable) {
        	var percentage = Math.round((e.loaded * 100) / e.total);
        	opts.onprogress(e, file, percentage);
    	}
    }
    function onload(e) {
        opts.onload(e, file);
    }
    function onerror(e) {
        opts.onerror(e, file);
    }
}

$.fn.FileUploader = function(opts) {
	return this.each(function() {		
		uploader(this, opts);
	});
};

})(window);