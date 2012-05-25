// DO NOT INCLUDE THIS FILE.  It is inlined into filereader.js and kept here for development purposes.

self.addEventListener('message', function(e) {
    var data = e.data;
    try {
        var reader = new FileReaderSync();
        postMessage({
            result: reader[data.readAs](data.file),
            extra: data.extra,
            file: data.file
        });
    }
    catch(e) { 
        postMessage({
            result: 'error',
            extra: data.extra,
            file: data.file
        }); 
    }
}, false);