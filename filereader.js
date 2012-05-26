/*!
    FileReader.js - a lightweight wrapper for common FileReader usage.
    Copyright 2012 Brian Grinstead - MIT License.
    See http://github.com/bgrins/filereader.js for documentation.
*/

(function(window, document) {

    var FileReader = window.FileReader;
    var FileReaderSyncSupport = false;
    var URL = window.URL || window.webkitURL;
    var workerScript = "self.addEventListener('message', function(e) { var data=e.data; try { var reader = new FileReaderSync; postMessage({ result: reader[data.readAs](data.file), extra: data.extra, file: data.file})} catch(e){ postMessage({ result:'error', extra:data.extra, file:data.file}); } }, false);";
    var fileReaderEvents = ['loadstart', 'progress', 'load', 'abort', 'error', 'loadend'];

    var FileReaderJS = window.FileReaderJS = {
        enabled: false,
        setupInput: setupInput,
        setupDrop: setupDrop,
        setupClipboard: setupClipboard,
        sync: false,
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

    // Setup jQuery plugin (if available)
    if (typeof(jQuery) !== "undefined") {
        jQuery.fn.fileReaderJS = function(opts) {
            return this.each(function() {
                if (!FileReaderJS.enabled) {
                    return;
                }
                $(this).is("input") ? setupInput(this, opts) : setupDrop(this, opts);
            });
        };

        jQuery.fn.fileClipboard = function(opts) {
            return this.each(function() {
                if (!FileReaderJS.enabled) {
                    return;
                }
                setupClipboard(this, opts);
            });
        };
    }

    // Not all browsers support the FileReader interface.  Return with the enabled bit = false.
    if (!FileReader) {
        return;
    }

    // WorkerHelper is a little wrapper for generating web weorkers from strings
    var WorkerHelper = (function() {

        var BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;

        function getURL (script) {
            if (window.Worker && BlobBuilder && URL) {
                var bb = new BlobBuilder();
                bb.append(script);
                return URL.createObjectURL(bb.getBlob());
            }

            return null;
        };

        function getWorker (script, onmessage) {
            var url = getURL(script);
            if (url) {
                var worker = new Worker(url);
                worker.onmessage = onmessage;
                return worker;
            }

            return null;
        };

        return {
            getURL: getURL,
            getWorker: getWorker
        }

    })();

    // setupClipboard: bind to clipboard events (intended for document.body)
    function setupClipboard(element, opts) {

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

        var instanceOptions = extend(extend({}, FileReaderJS.opts), opts);

        input.addEventListener("change", inputChange, false);
        function inputChange(e) {
            processFileList(e.target.files, instanceOptions);
        }
    }

    // setupDrop: bind the 'drop' event for a DOM element
    function setupDrop(dropbox, opts) {

        var instanceOptions = extend(extend({}, FileReaderJS.opts), opts);
        var dragClass = instanceOptions.dragClass;

        // Bind to body to prevent custom events from firing when it was initialized on the page.
        document.body.addEventListener("dragstart", globaldragstart, true);
        document.body.addEventListener("dragend", globaldragend, true);
        document.body.addEventListener("drop", preventFileRedirect, false);

        dropbox.addEventListener("dragenter", onlyWithFiles(dragenter), false);
        dropbox.addEventListener("dragleave", onlyWithFiles(dragleave), false);
        dropbox.addEventListener("dragover", onlyWithFiles(dragover), false);
        dropbox.addEventListener("drop", onlyWithFiles(drop), false);

        var initializedOnBody = false;
        function onlyWithFiles(fn) {
            return function() {
                if (initializedOnBody) {
                    return;
                }
                fn.apply(this, arguments);
            }
        }

        function globaldragend(e) {
            initializedOnBody = false;
        }

        function globaldragstart(e) {
            initializedOnBody = true;
        }

        function preventFileRedirect(e) {
            if (e.dataTransfer.files && e.dataTransfer.files.length ){
                e.stopPropagation();
                e.preventDefault();
            }
        }

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

        var sync = FileReaderJS.sync && FileReaderSyncSupport;
        var syncWorker;

        if (sync) {
            syncWorker = WorkerHelper.getWorker(workerScript, function(e) {

                var file = e.data.file;

                // Workers seem to lose the custom property on the file object.
                if (!file.extra) {
                    file.extra = e.data.extra;
                }

                if (e.data.result === "error") {
                    opts.on["error"]({ }, file);
                }
                else {
                    opts.on["load"]({ target: { result: e.data.result }}, file);
                }
                groupFileDone();
            });
        }

        Array.prototype.forEach.call(files, function(file) {

            if (opts.accept && !file.type.match(new RegExp(opts.accept))) {
                opts.on.skip(file);
                groupFileDone();
                return;
            }

            if (opts.on.beforestart(file) === false) {
                opts.on.skip(file);
                groupFileDone();
                return;
            }

            var readAs = getReadAsMethod(file.type, opts.readAsMap, opts.readAsDefault);

            if (sync && syncWorker) {
                syncWorker.postMessage({
                    file: file,
                    extra: file.extra,
                    readAs: readAs
                });
            }
            else {

                var reader = new FileReader();

                fileReaderEvents.forEach(function(eventName) {
                    reader['on' + eventName] = function(e) {
                        opts.on[eventName](e, file);
                        if (eventName == 'loadend') {
                            groupFileDone();
                        }
                    };
                });

                reader[readAs](file);
            }
        });
    }

    // checkFileReaderSyncSupport: Create a temporary worker and see if FileReaderSync exists
    function checkFileReaderSyncSupport() {
        var checkSyncSupportURL = WorkerHelper.getURL(
            "self.addEventListener('message', function(e) { postMessage(!!FileReaderSync); }, false);"
        );
        if (checkSyncSupportURL) {
            var worker = new Worker(checkSyncSupportURL);
            worker.onmessage = function(e) {
                FileReaderSyncSupport = e.data;
                URL.revokeObjectURL(checkSyncSupportURL);
            };
            worker.postMessage();
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
    checkFileReaderSyncSupport();

})(this, document);
