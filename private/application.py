import os
import sys
from time import time

import pathhack
import tornado.auth
import tornado.escape
import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.template
import formencode

from formencode import validators
#from crontab import CronTab
from creamertweet import couchdb

from tornado.web import HTTPError
from tornado.options import define, options

define("debug", default="false", help="run in debug mode")
define("port", default=8000, help="run on the given port", type=int)
define("cookie_secret", default="32oETzfau=sadY=ads'fas@rfasgv30-9]\e#jhAFDS=", help="secure cookie secret")
define("twitter_consumer_key", default="dCXxJkvD2dvmOYHgs5iEqg", help="twitter authentication consumer key")
define("twitter_consumer_secret", default="4rM0DZ7LMMxq1xBqr5wYlviiXHXAWcqOvC1cnz9HYpM", help="twitter authentication consumer secret")
define("couchdb_host", default="127.0.0.1", help="couchdb host")
define("couchdb_port", default=5984, help="couchdb port", type=int)
define("couchdb_async", default="false", help="whether to use couchdb in async mode")

class Application(tornado.web.Application):
    def __init__(self):
        handlers = [
            (r"/", MainHandler),
            (r"/auth/twitter", TwitterAuthHandler),
            (r"/auth/logout", LogoutAuthHandler),
            (r"/auth/register", RegisterAuthHandler),
            (r"/scriptslist", ScriptsListHandler),
            (r"/admin", AdminHandler),
            (r"/script/([^/]+)", ScriptDetailHandler),
            (r"/script/([^/]+)/([^/]+)/delete", ScriptDeleteHandler),
            (r"/activity", ActivityHandler),
            (r"/activity/changes", ActivityChangesHandler)
        ]
        settings = {
            "static_path": os.path.join(os.path.dirname(__file__),
                "..", "html", "static"),
            "template_path": os.path.join(os.path.dirname(__file__),
                "..", "html", "templates"),

            "login_url": "/auth/twitter",
            "cookie_secret": options.cookie_secret,
            "twitter_consumer_key": options.twitter_consumer_key,
            "twitter_consumer_secret": options.twitter_consumer_secret
        }
        tornado.web.ErrorHandler = MyErrorHandler
        tornado.web.Application.__init__(self, handlers, **settings)

        self.cdb = couchdb.CouchDB(host=options.couchdb_host, port=options.couchdb_port, async=True)


class BaseHandler(tornado.web.RequestHandler):
    def __init__(self, application, request):
        tornado.web.RequestHandler.__init__(self, application, request)
        self.ajax = self.get_argument('ajax', default=False)

    @property
    def cdb(self):
        return self.application.cdb
 
    def get_current_user(self):
        user_json = self.get_secure_cookie("user")
        if not user_json: return None
        return tornado.escape.json_decode(user_json)

    def clear_current_user(self):
        self.clear_cookie("user")

    def get_error_html(self, status_code, message=''):
        """Override to implement custom error pages."""
        if self.ajax:
            return '{ "status_code": "%s", "message": "%s" }' % (self._status_code, message)
        else:
            return self.render_string('error.html', message=message)


class MyErrorHandler(BaseHandler):
    """Generates an error response with status_code for all requests."""
    def __init__(self, application, request, status_code):
        BaseHandler.__init__(self, application, request)
        self.set_status(status_code)

    def get(self):
        if self.ajax:
            if self._status_code == 404:
                self.write('{ "status_code": "%s", "message": "%s" }' % (self._status_code, 'not found'))
        else:
            if self._status_code == 404:
                #self.write('%s not found' % self._status_code)
                self.render('404.html')

    def prepare(self):
        print 'EGGMAN11'


'''
class Default404Handler(BaseHandler):
    def get(self):
        self.write('no such shizzle')
'''

class MainHandler(BaseHandler):
    def get(self):
        cur_user = self.get_current_user()
        if cur_user and not cur_user['is_registered']:
            self.render("register.html", error=None, email='', accept=False)
        else:
            self.render("index.html")


class ActivityHandler(BaseHandler):
    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self):
        #
        '''
        # * * * * * /Users/konker/Sites/dev/creamertweet.com/private/cron.sh
        # get crontab status
        tab = CronTab()
        list = tab.find_command('creamertweet')

        cron_on = True
        if not len(list):
            cron_on = False
        '''

        self.scripts = None
        self.changes = None
        cur_user = self.get_current_user()
        self.cdb.view('creamertweet', 'scripts', 'owner', key=tornado.escape.json_encode([cur_user['username']]),
            callback=self.async_callback(self._on_data), label='scripts')
        self.cdb.changes('creamertweet', 0, filter="logs/owner", owner=cur_user['username'],
            callback=self.async_callback(self._on_data), label='changes')
        return

    def _on_data(self, data, label=None, **kwargs):
        if label == 'scripts':
            if data.get('status') == 'error':
                raise data['payload']
            else:
                self.scripts = scripts=dict([(i['id'], i['value']) for i in data['rows']])

        elif label == 'changes':
            if data.get('status') == 'error':
                raise data['payload']
            else:
                self.changes = data

        if label == 'scripts' or label == 'changes':
            if self.scripts != None and self.changes != None:
                keys = [k['id'] for k in self.changes['results']]
                if len(keys) > 0:
                    keys.reverse();
                    self.cdb._all_docs('creamertweet', include_docs="true", keys=keys,
                        callback=self.async_callback(self._on_data), label='activity')
                    return
                else:
                    self.render("activity.html", activity={'rows':[]}, scripts=self.scripts, scripts_json=tornado.escape.json_encode(self.scripts), last_seq=0)
                    return
                    
        elif label == 'activity':
            self.render("activity.html", activity=data, scripts=self.scripts, scripts_json=tornado.escape.json_encode(self.scripts), last_seq=self.changes['last_seq'])


class ActivityChangesHandler(BaseHandler):
    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self):
        cur_user = self.get_current_user()
        since = self.get_argument("since", 0)
        self.cdb.changes('creamertweet', since, filter="logs/owner", owner=cur_user['username'],
            callback=self.async_callback(self._on_data), label='changes')
        return

    def _on_data(self, data, label=None, **kwargs):
        if label == 'changes':
            if data.get('status') == 'error':
                raise data['payload']

            self.changes = data
            self.activity = { 'last_seq': self.changes['last_seq'], 'rows': [] }
            if len(data['results']) > 0:
                keys = [k['id'] for k in self.changes['results']]
                #keys.reverse();
                self.cdb._all_docs('creamertweet', include_docs="true", keys=keys,
                    callback=self.async_callback(self._on_data), label='activity')
            else:
                self.write(tornado.escape.json_encode(self.activity))
                self.finish()
                
        elif label == 'activity':
            if data.get('status') == 'error':
                raise data['payload']

            self.activity = data
            self.activity['last_seq'] = self.changes['last_seq']
            self.write(tornado.escape.json_encode(self.activity))
            self.finish()


class ScriptsListHandler(BaseHandler):
    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self):
        cur_user = self.get_current_user()
        self.error2 = None
        self.error3 = None
        self.cdb.view('creamertweet', 'scripts', 'owner', key=tornado.escape.json_encode([cur_user['username']]),
            callback=self.async_callback(self._on_data), label='scripts')
        return

    @tornado.web.authenticated
    @tornado.web.asynchronous
    def post(self):
        self.error2 = None
        self.error3 = None
        self.title = self.get_argument('title', default='')

        validator = validators.String(not_empty=True, strip=True)
        try:
            self.title = validator.to_python(self.title)
        except formencode.Invalid, e:
            self.error2 = 'Please enter a title'
            cur_user = self.get_current_user()
            self.cdb.view('creamertweet', 'scripts', 'owner', key=tornado.escape.json_encode([cur_user['username']]),
                callback=self.async_callback(self._on_data), label='scripts')
            return

        self.cdb.get_doc('creamertweet', 'blank_script', 
            callback=self.async_callback(self._on_data), label='blank')
        return

    def _on_data(self, data, label=None, **kwargs):
        if label == 'scripts':
            if data.get('status') == 'error':
                raise data['payload']

            self.render("scripts.html", scripts=data, error2=self.error2, error3=self.error3)

        elif label == 'blank':
            cur_user = self.get_current_user()
            del data['_rev']
            del data['_id']
            data['owner'] = cur_user['username']
            data['title'] = self.title

            self.cdb.create_doc('creamertweet', data,
                callback=self.async_callback(self._on_data), label='create')

        elif label == 'create':
            if data.get('status') == 'error':
                raise data['payload']

            self.redirect("/scriptslist")


class ScriptDeleteHandler(BaseHandler):
    @tornado.web.authenticated
    @tornado.web.asynchronous
    def post(self, script_id, rev):
        self.ajax = self.get_argument('ajax', default=False)
        script = self.cdb.get_doc('creamertweet', script_id,
            callback=self.async_callback(self._on_data), label='get')
        return

    def _on_data(self, data, label=None, **kwargs):
        if label == 'get':
            if data.get('status') == 'error':
                raise data['payload']

            cur_user = self.get_current_user()
            if data['owner'] == cur_user['username']:
                self.cdb.delete_doc('creamertweet', data['_id'], data['_rev'],
                    callback=self.async_callback(self._on_data), label='delete')
            else:
                raise HTTPError(500, "unauthorized")

        elif label == 'delete':
            if data.get('status') == 'error':
                raise data['payload']

            if (self.ajax):
                self.render("redirect.json", url="/scriptslist")
            else:
                self.redirect("/scriptslist")

    
class ScriptDetailHandler(BaseHandler):
    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self, script_id):
        cur_user = self.get_current_user()
        script = self.cdb.get_doc('creamertweet', script_id,
            callback=self.async_callback(self._on_data), label='get_get')
        return

    @tornado.web.authenticated
    @tornado.web.asynchronous
    def post(self, script_id):
        self.ajax = self.get_argument('ajax', default=False)
        self.enabled = self.get_argument('enabled', default='IGNORE')

        self.title = self.get_argument('title', default=False)
        validator = validators.String(not_empty=True, strip=True)
        tweet_validator = validators.String(not_empty=True, strip=True, min_length=1, max_length=140)
        try:
            self.title = validator.to_python(self.title)
        except formencode.Invalid, e:
            raise HTTPError(500, 'invalid title')

        self.users = self.get_argument('users', default=False)
        self.events = self.get_argument('events', default=False)

        # check users
        if self.users:
            self.users = tornado.escape.json_decode(self.users)
            try:
                for u,p in self.users.items():
                    validator.to_python(u)
            except formencode.Invalid, e:
                raise HTTPError(500, 'invalid user')

        # check events
        if self.events:
            self.events = tornado.escape.json_decode(self.events)
            try:
                for e in self.events:
                    validator.to_python(e['user'])
                    tweet_validator.to_python(e['text'])
            except:
                raise HTTPError(500, 'invalid event')

        if (self.enabled != 'IGNORE') or self.title or self.users or self.events:
            self.cdb.get_doc('creamertweet', script_id,
                callback=self.async_callback(self._on_data), label='post_get')
            return
        else:
            if (ajax):
                self.render("redirect.json", url="/script/%s" % script_id)
            else:
                self.redirect("/script/%s" % script_id)

    def _on_data(self, data, label=None, **kwargs):
        if label == 'get_get':
            if data.get('status') == 'error':
                raise HTTPError(404, 'No such script')

            # sort events by time
            data['events'].sort(key=lambda x: x['time'])
            self.render("script_detail.html", script=data, script_json=tornado.escape.json_encode(data))
            return

        elif label == 'post_get':
            if data.get('status') == 'error':
                raise data['payload']

            cur_user = self.get_current_user()
            self.script = data
            if self.script['owner'] == cur_user['username']:
                if self.enabled != 'IGNORE':
                    self.script['enabled'] = tornado.escape.json_decode(self.enabled)
                if self.title:
                    self.script['title'] = tornado.escape.json_decode(self.title)
                if self.users:
                    self.script['users'] = self.users
                if self.events:
                    self.script['events'] = self.events
                
                self.cdb.update_doc('creamertweet', self.script['_id'], self.script,
                    callback=self.async_callback(self._on_data), label='update')
                return
            else:
                raise HTTPError(500, "unauthorized")

        elif label == 'update':
            if data.get('status') == 'error':
                raise data['payload']

            if (self.ajax):
                self.render("redirect.json", url="/script/%s?%s" % (self.script['_id'], time()))
            else:
                self.redirect("/script/%s?%s" % (self.script['_id'], time()))


class AdminHandler(BaseHandler):
    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self):
        cur_user = self.get_current_user()
        if cur_user['is_admin']:
            self.cdb.view('creamertweet', 'users', 'username',
                callback=self.async_callback(self._on_data), label='users')
            return
        else:
            raise HTTPError(500, "unauthorized")

    def _on_data(self, data, label=None, **kwargs):
        if label == 'users':
            if data.get('status') == 'error':
                raise data['payload']

            self.render("admin.html", users=data)
        

class LogoutAuthHandler(BaseHandler):
    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self):
        self.clear_current_user()
        self.redirect("/")


class RegisterAuthHandler(BaseHandler):
    @tornado.web.authenticated
    @tornado.web.asynchronous
    def post(self):
        self.email = self.get_argument('email', default=False)
        self.accept = self.get_argument('accept', default=False)
        validator = validators.Email(not_empty=True, strip=True)
        try:
            self.email = validator.to_python(self.email)
        except Exception, e:
            self.render("register.html", error='Please enter a valid email address', email='', accept=self.accept)
        
        if not self.accept:
            self.render("register.html", error='Please accept the terms and conditions', email=self.email, accept=self.accept)

        else:
            self.user = self.get_current_user()
            self.user['is_registered'] = True
            self.user['email'] = self.email
            data = dict(admin=False, superuser=False, enabled=True, type='user', username=self.user['username'], email=self.email)
            self.cdb.create_doc('creamertweet', data, callback=self.async_callback(self._on_data), label='register')
            return

    def _on_data(self, data, label=None, **kwargs):
        if label == 'register':
            if data.get('status') == 'error':
                raise data['payload']

            self.set_secure_cookie("user", tornado.escape.json_encode(self.user))
            self.redirect("/")


class TwitterAuthHandler(BaseHandler, tornado.auth.TwitterMixin):
    @tornado.web.asynchronous
    def get(self):
        self.user = None
        if self.get_argument("oauth_token", None):
            self.get_authenticated_user(self.async_callback(self._on_auth))
            return
        self.authorize_redirect()

    def _on_auth(self, user):
        if not user:
            raise HTTPError(500, "Twitter authentication failed")

        self.user = user
        self.user['is_admin'] = False
        self.user['is_registered'] = False
        self.cdb.view('creamertweet', 'users', 'username', key=tornado.escape.json_encode(user['username']),
            callback=self.async_callback(self._on_data), label='auth')
        return

    def _on_data(self, data, label=None, **kwargs):
        if label == 'auth':
            if not data or len(data['rows']) == 0:
                self.set_secure_cookie("user", tornado.escape.json_encode(self.user))
                self.render("register.html", error=None, email='', accept=False)
                return

            else:
                self.user['is_registered']= True
                if data['rows'][0]['value']['admin']:
                    self.user['is_admin']= True
                else:
                    self.user['is_admin']= False

                self.set_secure_cookie("user", tornado.escape.json_encode(self.user))
                self.redirect("/")


'''
class CronOnHandler(BaseHandler):
    @tornado.web.authenticated
    def get(self):
        #
        # * * * * * /Users/konker/Sites/dev/creamertweet.com/private/cron.sh
        # get crontab status
        tab = CronTab()
        list = tab.find_command('cron.sh')

        if not len(list):
            # turn on cron
            command = os.path.abspath(os.path.join('..', 'private', 'cron.sh'))
            cron = tab.new(command=command)
            cron.minute().every(1)
            cron.parse(cron.render()) # this is an idiotic hack to set the cron.valid flag to True?
            tab.write()

        self.redirect("/activity")

class CronOffHandler(BaseHandler):
    @tornado.web.authenticated
    def get(self):
        #
        # * * * * * /Users/konker/Sites/dev/creamertweet.com/private/cron.sh
        # get crontab status
        tab = CronTab()
        list = tab.find_command('cron.sh')

        if len(list):
            # turn off cron
            cron = list[0]
            tab.remove(cron)
            tab.write()

        self.redirect("/activity")
'''

def main():
    tornado.options.parse_config_file('website.conf')
    http_server = tornado.httpserver.HTTPServer(Application())
    http_server.listen(options.port)
    try:
        tornado.ioloop.IOLoop.instance().start()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()


