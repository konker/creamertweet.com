#!/usr/bin/env python2.6

import os
import sys
import time
import logging
import pathhack

import json

from twitter import *
from creamertweet import *
from creamertweet import couchdb

IGNORE_ON_TRY = 4
SHOW_WAKE_SLEEP = False

def cron():
    start = time.time()
    # set up logging
    cdb = couchdb.CouchDB(async=False)
    logging.basicConfig(level=logging.INFO,
                        filename='creamertweet.log.json',
                        format='%(message)s')

    # read in the system state
    ct = CreamerTweet(cdb)

    # times are in UTC
    t = time.gmtime()
    now = time.mktime(t)
    now_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", t)

    if SHOW_WAKE_SLEEP:
        log_entry = dict([
            ('timestamp', now_str),
            ('owner', 'general'),
            ('action', 'WAKE'),
            ('status', 'OK'),
            ('message', ''),
            ('type', 'log')
        ])
        cdb.create_doc('creamertweet', log_entry)
        logging.info(json.dumps(log_entry))

    run_id_inc = 1
    dirty = False
    # process the enabled scripts
    for s in ct.scripts_enabled:
        # check to see if script has a time started stamp, if not, add one
        # also add a 'last_touched' stamp
        if not s.status().has_key('time_started'):
            s.status()['time_started'] = now_str
            s.status()['last_touched'] = now_str
            dirty = True

        # check to see if the script has a run id, if not, add one
        if not s.status().has_key('run_id'):
            s.status()['run_id'] = "%s%s" % (now, run_id_inc)
            ++run_id_inc
            dirty = True

        # find elements in the past not marked as 'sent' or 'ignored'
        for e in s.events():
            if not e.has_key('sent') and not e.has_key('ignored'):
                etime = time.mktime(time.strptime(e['time'], "%Y-%m-%dT%H:%M:%SZ"))

                # event is in the past
                if (now - etime) >= 0:
                    s.status()['last_touched'] = now_str
                    dirty = True

                    # increment the 'tries' count (add if necessary)
                    if e.has_key('tries'):
                        e['tries'] += 1
                    else:
                        e['tries'] = 1

                    # log and ignore if reached 'tries' threshold
                    if IGNORE_ON_TRY > 0:
                        if e['tries'] == IGNORE_ON_TRY:

                            # mark element as ignored
                            e['ignored'] = now_str

                            log_entry = dict([
                                ('timestamp', now_str),
                                ('owner', s.owner),
                                ('script_id', s.script['_id']),
                                ('run_id', s.status()['run_id']),
                                ('action', 'IGNORE'),
                                ('status', 'ERR1'),
                                ('event', e),
                                ('message', 'Event will be ignored, too many failures.'),
                                ('type', 'log')
                            ])
                            cdb.create_doc('creamertweet', log_entry)
                            logging.info(json.dumps(log_entry))

                            continue

                    try:
                        t = Twitter(e['user'], s.password(e['user']))
                        ret = t.statuses.update(status=e['text'])

                        # mark element as sent
                        e['sent'] = now_str

                        log_entry = dict([
                            ('timestamp', now_str),
                            ('owner', s.owner),
                            ('script_id', s.script['_id']),
                            ('run_id', s.status()['run_id']),
                            ('action', 'EXEC'),
                            ('status', 'OK'),
                            ('event', e),
                            ('message', ''),
                            ('type', 'log')
                        ])
                        cdb.create_doc('creamertweet', log_entry)
                        logging.info(json.dumps(log_entry))

                    except TwitterError, exc:
                        log_entry = dict([
                            ('timestamp', now_str),
                            ('owner', s.owner),
                            ('script_id', s.script['_id']),
                            ('run_id', s.status()['run_id']),
                            ('action', 'EXEC'),
                            ('status', 'ERR0'),
                            ('event', e),
                            ('message', json.loads(exc.details_str)),
                            ('type', 'log')
                        ])
                        cdb.create_doc('creamertweet', log_entry)
                        logging.info(json.dumps(log_entry))

                    except:
                        log_entry = dict([
                            ('timestamp', now_str),
                            ('owner', s.owner),
                            ('script_id', s.script['_id']),
                            ('run_id', s.status()['run_id']),
                            ('action', 'EXEC'),
                            ('status', 'ERR99'),
                            ('event', e),
                            ('message', sys.exc_info()[1].__repr__()),
                            ('type', 'log')
                        ])
                        cdb.create_doc('creamertweet', log_entry)
                        logging.info(json.dumps(log_entry))

        # save script if changes have been made
        if dirty:
            s.write(cdb)

    if SHOW_WAKE_SLEEP:
        end = time.time()
        log_entry = dict([
            ('timestamp', now_str),
            ('owner', 'general'),
            ('action', 'SLEEP'),
            ('status', 'OK'),
            ('message', end - start),
            ('type', 'log')
        ])
        cdb.create_doc('creamertweet', log_entry)
        logging.info(json.dumps(log_entry))


def main():
    try:
        cron()
        return 0
    except:
        print("ERROR %s" % sys.exc_info()[1])
        return -1


if __name__ == '__main__':
    sys.exit(main())
