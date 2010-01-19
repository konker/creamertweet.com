/*
 what about the same origin policy?
 */
var couchdb = (function() {
    return {
        host: 'localhost',
        port: 5984,
        prefif: '',
        base: '', 

        init: function(host, port, prefix) {
            if (host) {
                couchdb.host = host;
            }
            if (port) {
                couchdb.port = port;
            }
            if (prefix) {
                couchdb.prefix = prefix;
            }
            couchdb.base = 'http://' + couchdb.host + ':' + couchdb.port + couchdb.prefix;
        },

        /** Server level operations */
        _all_dbs: function(callback, kwargs) {
            var url = couchdb.base + '/_all_dbs?' + couchdb.__u(kwargs);
            return couchdb.__exec(url, callback)
        },

        /* helper code */
        __exec: function(request, callback) {
            console.log(request);
            if (typeof(request) == 'string') {
               request = couchdb.request(request);
               request.method = 'GET';
               request.data = '';
            }
            console.log(request);
            $.ajax({
                url: '/',
                success: function(d) { alert(d); },
                error: couchdb.__error
            }); 
            $.ajax({
               type: request.method,
               url: request.url,
               data: request.data,
               success: callback,
               error: couchdb.__error
            });
        },
        __error: function(XHR, textStatus, errorThrown) {
            alert('E|' + textStatus + '|');
        },
        __u: function(kwargs) {
            var url = ''
            for (n in kwargs) {
                url += (n + '=' + kwargs[n] + '&');
            }
            return url;
        },
        request: function(url) {
            this.url = url;
            return this;
        }
    }
})();

