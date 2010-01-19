#!/bin/bash
cd /home/konker/www/creamertweet.com/private
/usr/bin/python /home/konker/www/creamertweet.com/private/cron.py >> /home/konker/www/creamertweet.com/logs/cron.log 2>&1
