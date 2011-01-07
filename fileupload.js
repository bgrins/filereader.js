/*
filereader.js - a lightweight wrapper for FormData file uploads
Open source code under MIT license: http://www.opensource.org/licenses/mit-license.php
Author: Brian Grinstead

See http://github.com/bgrins/filereader.js for documentation
*/


(function(global) {
	
	var FileUploadJS = global.FileUploadJS = { 
		send: send
	};
		
	function send(file, opts) {
		
		// Default option callbacks
		opts = opts || { };
		opts.onprogress = opts.onprogress || function() { };
		opts.onerror = opts.onerror || function() { };
		opts.onload = opts.onload || function() { };
		opts.url = opts.url || "upload.php";
		opts.data = opts.data || { };
		
		
		// Generate FileData object
		var fd = new FormData();
		for (var d in opts.data) { fd.append(d, opts[d]); }
		fd.append("image", file);
		
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

})(this);
