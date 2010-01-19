
from __future__ import with_statement

import os
import json
import couchdb

class CreamerTweet(object):
    def __init__(self, cdb):
        self.scripts_enabled = []
        
        # read in enabled scripts
        res = cdb.view('creamertweet', 'scripts', 'enabled')
        for s in res['rows']:
            self.scripts_enabled.append(Script(s['key'][0], s['value']))
        '''
        # read in the system state
        with open('system.json') as f:
            self.system = json.load(f)

        # read in the specified scripts
        for s in self.system['scripts_enabled']:
            self.scripts_enabled.append(Script(s[0], s[1]))
        '''

class Script(object):
    def __init__(self, owner, script):
        self.owner = owner
        self.script = script

        assert self.script.has_key('status'), "Script must have status section"
        assert self.script.has_key('events'), "Script must have events section"

    def script(self):
        return self.script

    def status(self):
        return self.script['status']

    def users(self):
        return self.script['users']

    def events(self):
        return self.script['events']

    def password(self, user):
        assert self.script['users'].has_key(user), ("User %s not defined" % user)
        return self.script['users'][user]

    def verify(self):
        '''
        verify the script:
        check events:
            - user appears in users struct
            - text is <= 140
            - (some
        '''
        pass

    def write(self, cdb):
        '''
        with open(self.fname, 'w') as f:
            f.write(json.dumps(self.rep))
        '''
        cdb.update_doc('creamertweet', self.script['_id'], self.script)



