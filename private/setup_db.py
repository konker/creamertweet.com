import pathhack
import json
from creamertweet.couchdb import *

cdb = CouchDB(async=False)

print 'setting up creamertweet db...'
try:
    print(cdb.delete_db('creamertweet'))
except:
    pass
print cdb.create_db('creamertweet')

print 'create users...'
doc = dict(type='user', username='konker', enabled=True, admin=True, superuser=True)
print(cdb.create_doc('creamertweet', doc))

doc = dict(type='user', username='creamertweet', enabled=True, admin=False, superuser=False)
print(cdb.create_doc('creamertweet', doc))

doc = dict(type='user', username='culturalelite', enabled=True, admin=False, superuser=False)
print(cdb.create_doc('creamertweet', doc))

doc = json.loads('''
{
   "_id": "_design/users",
   "language": "javascript",
   "views": {
       "username": {
           "map": "function(doc) {  if (doc.type == 'user') {    emit(doc.username, doc);  }}"
       }
   }
}
''')
print(cdb.create_doc('creamertweet', doc))


print 'create scripts...'
doc = json.loads('''
{
    "title": "Untitled script",
    "status": {
    },
    "users": {
    },
    "events": [
    ]
}
''')
doc.update(type='script', _id="blank_script", owner='system', enabled=False)
print(cdb.create_doc('creamertweet', doc))
doc = json.loads('''
{
    "title": "Test Script 1",
    "status": {
    },
    "users": {
        "creamertweet": "r0knadr0k",
        "someotheruser": "somepassword"
    },
    "events": [
        { "user": "creamertweet", "time": "2009-12-09T17:05:00Z", "text": "test message 601" },
        { "user": "creamertweet", "time": "2009-12-09T17:11:00Z", "text": "test message 602" },
        { "user": "someotheruser", "time": "2009-12-09T18:25:00Z", "text": "test message 603" }
    ]
}
''')
doc.update(type='script', owner='konker', enabled=True)
print(cdb.create_doc('creamertweet', doc))

doc = json.loads('''
{
    "title": "Test Script 2",
    "status": {
    },
    "users": {
        "creamertweet": "r0knadr0k",
        "someotheruser": "somepassword"
    },
    "events": [
        { "user": "creamertweet", "time": "2009-12-09T17:05:00Z", "text": "test message 601" },
        { "user": "creamertweet", "time": "2009-12-09T17:11:00Z", "text": "test message 602" },
        { "user": "someotheruser", "time": "2009-12-09T18:25:00Z", "text": "test message 603" }
    ]
}
''')
doc.update(type='script', owner='konker', enabled=False)
print(cdb.create_doc('creamertweet', doc))


doc = json.loads('''
{
   "_id": "_design/scripts",
   "language": "javascript",
   "views": {
       "enabled": {
           "map": "function(doc) {  if (doc.type == 'script' && doc.enabled) {    emit([doc.owner], doc);  }}"
       },
       "disabled": {
           "map": "function(doc) {  if (doc.type == 'script' && !doc.enabled) {    emit([doc.owner], doc);  }}"
       },
     "owner": {
           "map": "function(doc) {  if (doc.type == 'script') {    emit([doc.owner], doc);  }}"
       }
   }
}
''')
print(cdb.create_doc('creamertweet', doc))


print 'setting up logs...'
doc = json.loads('''
{
   "_id": "_design/logs",
   "language": "javascript",
   "views": {
       "owner": {
           "map": "function(doc) {  if (doc.type == 'log') {    emit([doc.owner, doc.timestamp], doc);  }}"
       },
       "timestamp": {
           "map": "function(doc) {  if (doc.type == 'log') {    emit([doc.timestamp], doc);  }}"
       }
   },
   "filters": {
       "owner": "function(doc, req) { if(doc.type == 'log' && doc.owner == req.query.owner) { return true; } else { return false; }}"
   }
}
''')
print(cdb.create_doc('creamertweet', doc))


