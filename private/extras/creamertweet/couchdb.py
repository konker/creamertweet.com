'''
Simple async interface to the CouchDB API.
Uses tornado http and escape libs.

http://wiki.apache.org/couchdb/API_Cheatsheet
http://www.tornadoweb.org/documentation#module-index
'''

from tornado.httpclient import AsyncHTTPClient, HTTPClient, HTTPRequest, HTTPError
from tornado.escape import json_encode, json_decode, url_escape

class CouchDBError(Exception):
    def __init__(self, msg, rep=None):
        self.msg = msg
        
class CouchDB(object):
    def __init__(self, host='localhost', port=5984, async=True):
        self.host = host
        self.port = port
        self.base = 'http://%s:%s' % (self.host, self.port)
        self.async = async

        if self.async:
            self.client = AsyncHTTPClient()
        else:
            self.client = HTTPClient()

    '''
    Server level operations
    '''
    def _all_dbs(self, callback=None, label=None, **kwargs):
        url = '%s/_all_dbs?%s' % (self.base, self.__u(kwargs))
        return self.__exec(url, callback, label)

    def _config(self, callback=None, label=None, **kwargs):
        raise CouchDBError('Not implemented')

    def _uuids(self, callback=None, label=None, **kwargs):
        url = '%s/_uuids?%s' % (self.base, self.__u(kwargs))
        return self.__exec(url, callback, label)

    def _replicate(self, callback=None, label=None, **kwargs):
        raise CouchDBError('Not implemented')

    def _stats(self, callback=None, label=None, **kwargs):
        raise CouchDBError('Not implemented')

    def _active_tasks(self, callback=None, label=None, **kwargs):
        raise CouchDBError('Not implemented')


    '''
    Database level operations
    TODO: changes, long/continous polling
    '''
    def db_info(self, db_name, callback=None, label=None, **kwargs):
        url = '%s/%s?%s' % (self.base, url_escape(db_name), self.__u(kwargs))
        return self.__exec(url, callback, label)

    def create_db(self, db_name, callback=None, label=None):
        url = '%s/%s' % (self.base, url_escape(db_name))
        return self.__exec(url, callback, label, method='PUT', body='')

    def delete_db(self, db_name, callback=None, label=None):
        url = '%s/%s' % (self.base, url_escape(db_name)) 
        request = HTTPRequest(method='DELETE', url=url, body='')
        return self.__exec(request, callback, label)

    def _compact(self, db_name, callback=None, label=None, **kwargs):
        raise CouchDBError('Not implemented')

    def _bulk_docs(self, db_name, docs_array, callback=None, label=None):
        url = '%s/%s/_bulk_docs' % (self.base, url_escape(db_name)) 
        body = json_encode(docs_array)
        #[TODO: add headers]
        #headers = dict(Content-type='application/json')
        request = HTTPRequest(method='POST', url=url, body=body)
        return self.__exec(request, callback, label)

    def _temp_view(self, db_name, view_str, callback=None, label=None):
        url = '%s/%s/_temp_view' % (self.base, url_escape(db_name))
        body = view_str
        request = HTTPRequest(method='POST', url=url, body=body)
        return self.__exec(request, callback, label)

    def view(self, db_name, design_doc, view, callback=None, label=None, **kwargs):
        url = '%s/%s/_design/%s/_view/%s?%s' % (self.base, url_escape(db_name), url_escape(design_doc), url_escape(view), self.__u(kwargs))
        return self.__exec(url, callback, label)

    def changes(self, db_name, since=0, callback=None, label=None, **kwargs):
        url = '%s/%s/_changes?since=%s&%s' % (self.base, url_escape(db_name), since, self.__u(kwargs))
        return self.__exec(url, callback, label)


    '''
    Document level operations
    TODO: copy
    TODO: attachments
    TODO: revisions?
    '''
    def _all_docs(self, db_name, callback=None, label=None, **kwargs):
        if kwargs['keys']:
            keys = kwargs['keys']
            del kwargs['keys']
            url = '%s/%s/_all_docs?%s' % (self.base, url_escape(db_name), self.__u(kwargs))
            body = json_encode({"keys": keys})
            request = HTTPRequest(method='POST', url=url, body=body)
            return self.__exec(request, callback, label)
        else:
            url = '%s/%s/_all_docs?%s' % (self.base, url_escape(db_name), self.__u(kwargs))
            return self.__exec(url, callback, label)

    def _all_docs_by_seq(self, db_name, callback=None, label=None, **kwargs):
        url = '%s/%s/_all_docs_by_seq?%s' % (self.base, url_escape(db_name), self.__u(kwargs))
        return self.__exec(url, callback, label)

    def get_doc(self, db_name, doc_id, callback=None, label=None, **kwargs):
        url = '%s/%s/%s?%s' % (self.base, url_escape(db_name), doc_id, self.__u(kwargs))
        return self.__exec(url, callback, label)

    def create_doc(self, db_name, doc, callback=None, label=None):
        url = '%s/%s' % (self.base, url_escape(db_name))
        body = json_encode(doc)
        request = HTTPRequest(method='POST', url=url, body=body)
        return self.__exec(request, callback, label)

    def update_doc(self, db_name, doc_id, doc, callback=None, label=None):
        url = '%s/%s/%s' % (self.base, url_escape(db_name), url_escape(doc_id))
        body = json_encode(doc)
        request = HTTPRequest(method='PUT', url=url, body=body)
        return self.__exec(request, callback, label)

    def delete_doc(self, db_name, doc_id, rev, callback=None, label=None, **kwargs):
        url = '%s/%s/%s?rev=%s&%s' % (self.base, url_escape(db_name), url_escape(doc_id), url_escape(rev), self.__u(kwargs))
        request = HTTPRequest(method='DELETE', url=url, body='')
        return self.__exec(request, callback, label)


    ''' helper code '''
    def __exec(self, request, callback=None, label=None, **kwargs):
        if self.async:
            return self.client.fetch(request, self.__mk_json_callback(callback, label), **kwargs)
        else:
            response = self.client.fetch(request, **kwargs)
            if response.error:
                #[FIXME: better error handling]
                return { "status":"error", "message":response.error }
            else:
                return json_decode(response.body)

    def __mk_json_callback(self, callback, label=None):
        def ret(response):
            if not callback:
                pass
            elif response.error:
                #[FIXME: better error handling]
                print dir(response.error)
                if label:
                    callback({ "status":"error", "payload":response.error }, label)
                else:
                    callback({ "status":"error", "message":response.error })
            else:
                if label:
                    callback(json_decode(response.body), label)
                else:
                    callback(json_decode(response.body))

        return ret

    def __u(self, kwargs):
        url = ''
        for n,v in kwargs.items():
            url += '%s=%s&' % (url_escape(n), url_escape(str(v)))
        return url

