/*
filereader.js - a lightweight wrapper for common FileReader usage.
Open source code under MIT license: http://www.opensource.org/licenses/mit-license.php
Author: Brian Grinstead

See http://github.com/bgrins/filereader.js for documentation
*/

(function(global) {

    var FileReader = global.FileReader;
    var FileReaderJS = global.FileReaderJS = {
        enabled: false,
        setupInput: setupInput,
        setupDrop: setupDrop,
        setupClipboard: setupClipboard,

        opts: {
            dragClass: "drag",
            accept: false,
            readAsMap: {
                'image/*': 'DataURL',
                'text/*' : 'Text'
            },
            readAsDefault: 'BinaryString',
            on: {
                loadstart: noop,
                progress: noop,
                load: noop,
                abort: noop,
                error: noop,
                loadend: noop,
                skip: noop,
                groupstart: noop,
                groupend: noop,
                beforestart: noop
            }
        },
        output: []
    };
    var fileReaderEvents = ['loadstart', 'progress', 'load', 'abort', 'error', 'loadend'];

    // setup jQuery plugin if available
    if (typeof(jQuery) !== "undefined") {
        jQuery.fn.fileReaderJS = function(opts) {
            return this.each(function() {
                $(this).is("input") ? setupInput(this, opts) : setupDrop(this, opts);
            });
        };

        jQuery.fn.fileClipboard = function(opts) {
            return this.each(function() {
                setupClipboard(this, opts);
            });
        };
    }

    if (!FileReader) {
        // Not all browsers support the FileReader interface.  Return with the enabled bit = false
        return;
    }

    function setupClipboard(element, opts) {
        if (!FileReaderJS.enabled) {
            return;
        }

        var instanceOptions = extend(extend({}, FileReaderJS.opts), opts);
        element.addEventListener("paste", onpaste, false);

        function onpaste(ev) {
            var files = [];
            var clipboardData = ev.clipboardData || {};            
            var items = clipboardData.items || [];

            for (var i = 0; i < items.length; i++) {
                var file = items[i].getAsFile();
                if (file) {
                    var matches = new RegExp("image/\(.*\)").exec(file.type);
                    if (matches) {
                        var extension = matches[1];
                        file.name = "clipboard" + i + "." + extension;
                        files.push(file);
                    }
                }
            }

            if (files.length) {
                processFileList(files, instanceOptions);
                ev.preventDefault();
                ev.stopPropagation();
            }
        }
    };

    // setupInput: bind the 'change' event to an input[type=file]
    function setupInput(input, opts) {
        if (!FileReaderJS.enabled) {
            return;
        }

        var instanceOptions = extend(extend({}, FileReaderJS.opts), opts);

        input.addEventListener("change", inputChange, false);
        function inputChange(e) {
            processFileList(e.target.files, instanceOptions);
        }
    }

    // setupDrop: bind the 'drop' event for a DOM element
    function setupDrop(dropbox, opts) {
        if (!FileReaderJS.enabled) {
            return;
        }

        var instanceOptions = extend(extend({}, FileReaderJS.opts), opts),
            dragClass = instanceOptions.dragClass;

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
            processFileList(e.dataTransfer.files, instanceOptions);
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
            if (dragClass) {
                addClass(dropbox, dragClass);
            }
            e.stopPropagation();
            e.preventDefault();
        }
    }

    // setupCustomFileProperties: modify the file object with extra properties
    function setupCustomFileProperties(files, groupID) {
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            file.extra = {
                nameNoExtension: file.name.substring(0, file.name.lastIndexOf('.')),
                extension: file.name.substring(file.name.lastIndexOf('.') + 1),
                fileID: i,
                uniqueID: getUniqueID(),
                groupID: groupID,
                prettySize: prettySize(file.size)
            };
        }
    }

    // getReadAsMethod: return method name for 'readAs*' - http://dev.w3.org/2006/webapi/FileAPI/#reading-a-file
    function getReadAsMethod(type, readAsMap, readAsDefault) {
        for (var r in readAsMap) {
            if (type.match(new RegExp(r))) {
                return 'readAs' + readAsMap[r];
            }
        }
        return 'readAs' + readAsDefault;
    }

    // processFileList: read the files with FileReader, send off custom events.
    function processFileList(files, opts) {

        var group = {
            groupID: getGroupID(),
            files: files,
            started: new Date()
        };

        FileReaderJS.output.push(group);

        var filesLeft = files.length;
        var groupFileDone =	function() {
            if (--filesLeft == 0) {
                group.ended = new Date();
                opts.on.groupend(group);
            }
        };

        setupCustomFileProperties(files, group.groupID);

        opts.on.groupstart(group);

        // No files in group - call groupend immediately
        if (!files.length) {
            group.ended = new Date();
            opts.on.groupend(group);
        }

        for (var i = 0; i < files.length; i++) {

            var file = files[i];
            if (opts.accept && !file.type.match(new RegExp(opts.accept))) {
                opts.on.skip(file);
                groupFileDone();
                continue;
            }

            if (opts.on.beforestart(file) === false) {
                opts.on.skip(file);
                groupFileDone();
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
                        opts.on[eventName](e, file);
                        if (eventName == 'loadend') {
                            groupFileDone();
                        }
                    };
                })(eventName, file);
            }

            reader[getReadAsMethod(file.type, opts.readAsMap, opts.readAsDefault)](file);
        }
    }

    // noop: do nothing
    function noop() {

    }

    // extend: used to make deep copies of options object
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

    // hasClass: does an element have the css class?
    function hasClass(el, name) {
        return new RegExp("(?:^|\\s+)" + name + "(?:\\s+|$)").test(el.className);
    }

    // addClass: add the css class for the element.
    function addClass(el, name) {
        if (!hasClass(el, name)) {
          el.className = el.className ? [el.className, name].join(' ') : name;
        }
    }

    // removeClass: remove the css class from the element.
    function removeClass(el, name) {
        if (hasClass(el, name)) {
          var c = el.className;
          el.className = c.replace(new RegExp("(?:^|\\s+)" + name + "(?:\\s+|$)", "g"), " ").replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        }
    }

    // prettySize: convert bytes to a more readable string.
    function prettySize(bytes) {
        var s = ['bytes', 'kb', 'MB', 'GB', 'TB', 'PB'];
        var e = Math.floor(Math.log(bytes)/Math.log(1024));
        return (bytes/Math.pow(1024, Math.floor(e))).toFixed(2)+" "+s[e];
    }

    // getGroupID: generate a unique int ID for groups.
    var getGroupID = (function(id) {
        return function() {
            return id++;
        }
    })(0);

    // getUniqueID: generate a unique int ID for files
    var getUniqueID = (function(id) {
        return function() {
            return id++;
        }
    })(0);

    // The interface is supported, bind the FileReaderJS callbacks
    FileReaderJS.enabled = true;

})(this);