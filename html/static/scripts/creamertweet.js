/**
    creamertweet.js

    - source control ****

    - have some way to config out differences between dev and live
        - cron.py/sh
        - init.d
        - tornado_daemon.py

    - status page
        - filters
            - log types
            - scripts
            - users (?)

        - auto refresh?
            - look into long-polling, etc
            - will probably need some kind of couchdb fixes as well
    
    - sort the events on the script detail page
        - do it in python?

    - check that there is a list of authorized users
        - may need to create a cdb doc with this in it

    - proper error handling
        - cdb
        - website.py
        - templates

    - security audit
        - esp. website.py

    - proper admin section
        - manage authorized users
        - manage cron?

    O init.d script for tornado?

    - do we need to move events out of scripts?

    - do we need to look at alternative db approach?
        - e.g. mysql with nosql hacks?

    - register?
        - invites

    - make it clearer that it is alpha?

    - i18n

    - do the harri häämelälainen test

    - static caching
        - what about css?
        - can we make css a template?

    - template inheritance/modules?

    - tornado/couchdb logos for footer?

    - follow @creamertweet on twitter?
        - destroy the test messages

    - create @creamertweet-test for this?

    - email addresses, googleapps for domain..

    - some kind of groups, or some other way for users to collaborate on scripts

    - quotas
        

*/

var creamertweet = function() {
	return {
        user: null,

		init: function() {
            if ($('body.activity').length) {
                creamertweet.activity.init();
            }
            if ($('body.script-detail').length) {
                creamertweet.scriptDetail.init();
            }
            if ($('body.admin').length) {
                creamertweet.admin.users.init();
            }
        },
        admin: {
            users: {
                init: function() {
                    creamertweet.admin.users.loading(false);
                },
                loading: function(bShow) {
                    if (bShow) {
                        $('h2 .loading img').css('visibility', 'visible');
                    }
                    else {
                        $('h2 .loading img').css('visibility', 'hidden');
                    }
                },
                render: function() {
                },
                _renderItem: function() {
                }
            }
        },
        activity: {
            TICK_DELAY_MS: 1000 * 15,
            TICK_ID: -1,

            scripts: {},
            last_seq: 0,

            init: function() {
                $('.text').each(function(i) {
                    this.innerHTML = creamertweet.twitter.toHTML(this.innerHTML);
                });
                $('.timestamp').each(function(i) {
                    this.innerHTML = creamertweet.util.displayDate(this.innerHTML);
                });
                
                creamertweet.activity.TICK_ID = setTimeout(function() {
                    creamertweet.activity.tick();
                },
                creamertweet.activity.TICK_DELAY_MS);
                creamertweet.activity.loading(false);
            },
            loading: function(bShow) {
                if (bShow) {
                    $('h2 .loading img').css('visibility', 'visible');
                }
                else {
                    $('h2 .loading img').css('visibility', 'hidden');
                }
            },
            tick: function() {
                creamertweet.activity.loading(true);
                // open long poll to activity
                $.ajax({
                    url: '/activity/changes?since=' + creamertweet.activity.last_seq,
                    type: 'GET',
                    success: function(r) {
                        r = JSON.parse(r);
                        creamertweet.activity.render(r);
                        if (r['last_seq']) {
                            creamertweet.activity.last_seq = r['last_seq'];
                        }
                        creamertweet.activity.TICK_ID = setTimeout(function() {
                            creamertweet.activity.tick();
                        },
                        creamertweet.activity.TICK_DELAY_MS);
                    }
                });
                creamertweet.activity.loading(false);
                return false;
            },
            render: function(items) {
                for (var r in items['rows']) {
                    creamertweet.activity._renderItem(items['rows'][r]['doc']); 
                }
            },
            _renderItem: function(log) {
                var row = $('#templates .activity-item').clone();
                row.attr('class', log['status'] + ' ' + log['action'])

                row.find('.user a').attr('href', 'http://twitter.com/' + log['event']['user']).html('@' + log['event']['user']);
                row.find('.event .time').html(creamertweet.util.displayDate(log['event']['time']));
                row.find('.event .text').html(log['event']['text']);
                if (log['event']['tries']) {
                    row.find('.meta .tries').html('tries: ' + log['event']['tries']);
                }
                if (log['event']['sent']) {
                    row.find('.meta .sent').html('sent: ' + creamertweet.util.displayDate(log['event']['sent']));
                }
                if (log['event']['ignored']) {
                    row.find('.meta .ignored').html('ignored: ' + creamertweet.util.displayDate(log['event']['ignored']));
                }

                row.find('.ctuser a').attr('href', '/script/' + log['script_id']).html(log['owner'] + '/' + creamertweet.activity.scripts[log['script_id']].title);
                if (log['message']['error']) {
                    row.find('.message').html(log['message']['error']);
                }
                else if (log['message'] != ''){
                    row.find('.message').html(log['message']);
                }
                else {
                    row.find('.message').remove();
                }
                row.hide();
                $('#logList').prepend(row);
                row.slideDown('slow');
            }
        },
        scriptDetail: {
            init: function() {
                //console.log(_data);
                creamertweet.scriptDetail.events._lastDate = $.cookie(creamertweet.scriptDetail.events.LAST_DATE_COOKIE_NAME);
                if (!creamertweet.scriptDetail.events._lastDate) {
                    creamertweet.scriptDetail.events._lastDate = creamertweet.util.ISODateString(new Date());
                }

                // render meta
                var meta = $('#scriptMeta');
                meta.find('dd.owner').html(_data['owner']);
                if (_data['status']['time_started']) {
                    meta.find('dd.started').html(_data['status']['time_started']);
                }
                else {
                    meta.find('dd.started').html('never');
                }
                if (_data['status']['last_touched']) {
                    meta.find('dd.touched').html(_data['status']['last_touched']);
                }
                else {
                    meta.find('dd.touched').html('never');
                }

                // script tools
                if (_data['status']['last_touched']) {
                    $('#mainTitle .delete a').bind('click', function() {
                        if (confirm('Are you sure you want to delete this script? This action cannot be undone. You will have some orphanded items in the activity view.')) {
                            creamertweet.scriptDetail._delete(this.href);
                        }
                        return false;
                    });
                }
                else {
                    $('#mainTitle .delete a').bind('click', function() {
                        if (confirm('Are you sure you want to delete this script? This action cannot be undone.')) {
                            creamertweet.scriptDetail._delete(this.href);
                        }
                        return false;
                    });
                }
                $('#mainTitle .edit a').bind('click', function() {
                    creamertweet.scriptDetail._edit();
                    return false;
                });
                $('#scriptMeta .disable a').bind('click', creamertweet.scriptDetail._disable);
                $('#scriptMeta .enable a').bind('click', creamertweet.scriptDetail._enable);

                // render users
                creamertweet.scriptDetail.users.render(_data);

                // render events
                creamertweet.scriptDetail.events.render(_data);

                // build index of users in events
                creamertweet.scriptDetail.events.__rebuild_user_index();

                $('#scriptMeta .timestamp').each(function(i) {
                    this.innerHTML = creamertweet.util.displayDate(this.innerHTML);
                });
                creamertweet.scriptDetail.loading(false);
            },
            loading: function(bShow) {
                if (bShow) {
                    $('#mainTitle .loading img').css('visibility', 'visible');
                }
                else {
                    $('#mainTitle .loading img').css('visibility', 'hidden');
                }
            },
            _edit: function() {
                var inp = $('#templates .editable-title').eq(0).clone();
                inp.find('input').val(_data['title']);
                if (!_data['enabled']) {
                    inp.find('select option').eq(1).attr('selected', 'selected');
                }

                inp.find('#titleForm').unbind('submit').bind('submit', function() {
                    creamertweet.scriptDetail._save();
                    return false;
                });
                inp.find('.save a').bind('click', function() {
                    creamertweet.scriptDetail._save();
                    return false;
                });
                inp.find('.cancel a').bind('click', function() {
                    creamertweet.scriptDetail._cancel();
                    return false;
                });
                
                $('#mainTitle .title').html(inp);
                inp.find('input').focus().select();
                creamertweet.scriptDetail.loading(false);
                return false;
            },
            _save: function() {
                creamertweet.scriptDetail.loading(true);
                var t = $('#mainTitle input.text').val();
                var e = $('#mainTitle select').val();

                //[FIXME: better validation]
                if (!t) {
                    alert('Please enter a title');
                    creamertweet.scriptDetail.loading(false);
                    return false;
                }

                _data['title'] = t;
                _data['enabled'] = (e == 'true');
                $.ajax({
                    url: '/script/' + _data['_id'],
                    type: 'POST',
                    data: 'ajax=true&title=' + JSON.stringify(_data['title']) + '&enabled=' + JSON.stringify(_data['enabled']),
                    success: function(r) {
                        r = JSON.parse(r);
                        if (r && r.url) {
                            document.location = r.url;
                        }
                    }
                });
                return false;
            },
            _cancel: function() {
                var content = $('#templates .normal-title').eq(0).clone();
                content.find('.text').html(_data['title']);
                if (_data['enabled']) {
                    content.find('.status').html('enabled').addClass('enabled');
                }
                else {
                    content.find('.status').html('disabled').addClass('disabled');
                }

                content.find('.edit a').bind('click', function() {
                    creamertweet.scriptDetail._edit();
                    return false;
                });
                if (_data['status']['last_touched']) {
                    content.find('.delete a').bind('click', function() {
                        alert('Scripts which have been started cannot be deleted');
                        return false;
                    });
                }
                else {
                    content.find('.delete a').bind('click', function() {
                        if (confirm('Are you sure?')) {
                            creamertweet.scriptDetail._delete(this.href);
                        }
                        return false;
                    });
                }

                $('#mainTitle .title').html(content);
                creamertweet.scriptDetail.loading(false);
                return false;
            },
            _enable: function() {
                creamertweet.scriptDetail.__toggleEnabled(this.href, true);
                return false;
            },
            _disable: function() {
                creamertweet.scriptDetail.__toggleEnabled(this.href, false);
                return false;
            },
            _delete: function(href) {
                $.ajax({
                    url: href,
                    type: 'POST',
                    data: 'ajax=true',
                    success: function(r) {
                        r = JSON.parse(r);
                        if (r && r.url) {
                            document.location = r.url;
                        }
                    }
                });
                return false;
            },
            events: {
                LAST_DATE_COOKIE_NAME: '_ct_sd_ev_lastDate',
                _curEditing: -1,
                __userIndex: {},
                _lastDate: null,

                __rebuild_user_index: function() {
                    creamertweet.scriptDetail.events.__userIndex = {};
                    $.each(_data['events'], function(i, item) {
                        if (creamertweet.scriptDetail.events.__userIndex[item['user']]) {
                            creamertweet.scriptDetail.events.__userIndex[item['user']].push(i);
                        }
                        else {
                            creamertweet.scriptDetail.events.__userIndex[item['user']] = [i];
                        }
                    });
                },

                loading: function(bShow) {
                    if (bShow) {
                        $('#scriptEvents .loading').show();
                    }
                    else {
                        $('#scriptEvents .loading').hide();
                    }
                },
                render: function(script) {
                    $('#scriptEvents .add a').bind('click', function() {
                        creamertweet.scriptDetail.events._add();
                        return false;
                    });
                    $.each(script['events'], function(i, item) {
                        $('#scriptEvents ul.items').append(
                            creamertweet.scriptDetail.events._renderItem(i, item)
                        );
                    });
                    creamertweet.scriptDetail.events.loading(false);
                },
                _renderItem: function(i, item) {
                    if (!item) {
                        return null;
                    }
                    var row = $('#templates .event-row').clone();
                    row.attr('id', 'event' + i);

                    // populate item
                    row.find('.user a').attr('href', 'http://twitter.com/' + item['user']).html('@' + item['user']);
                    row.find('.text').html(creamertweet.twitter.toHTML(item['text']));

                    var d = creamertweet.util.parseDateRaw(item['time']);
                    row.find('.time .year').html(d[1]);
                    row.find('.time .month').html(creamertweet.util.MONTH_NAMES[--d[2]].toUpperCase());
                    row.find('.time .day').html(d[3]);
                    row.find('.time .hour').html(d[4]);
                    row.find('.time .min').html(d[5]);

                    if (item['tries']) {
                        row.find('.meta .tries').html('tries: ' + item['tries']);
                    }
                    else {
                        row.find('.meta .tries').html('tries: 0');
                    }
                    if (item['sent']) {
                        row.find('.meta .sent').html('sent: ' + creamertweet.util.displayDate(item['sent']));
                    }
                    else {
                        row.find('.meta .sent').removeClass('sent');
                    }
                    if (item['ignored']) {
                        row.find('.meta .ignored').html('ignored: ' + creamertweet.util.displayDate(item['ignored']));
                    }
                    else {
                        row.find('.meta .ignored').removeClass('ignored');
                    }

                    // tools
                    row.find('.edit a').bind('click', function() {
                        creamertweet.scriptDetail.events._edit(i);
                        return false;
                    });
                    row.find('.delete a').bind('click', function() {
                        if (confirm('Are you sure?')) {
                            creamertweet.scriptDetail.events._delete(i);
                        }
                        return false;
                    });
                    return row;
                },
                _add: function() {
                    if (creamertweet.util.isEmpty(_data['users'])) {
                        alert('You must have at least 1 user to add an event');
                        return false;
                    }
                    creamertweet.scriptDetail.events._cancelCur();
                    creamertweet.scriptDetail.users._cancelCur();

                    $('#scriptEvents .add').hide();
                    var i = _data['events'].length;
                    var editRow = $('#templates .editable-event-row').clone();
                    editRow.attr('id', 'event' + i);

                    var select = editRow.find('.user select');
                    $.each(_data['users'], function(username, password) {
                        select.append('<option value="' + username + '">@' + username + '</option>');
                    });
                    if (creamertweet.util.objLen(_data['users']) > 1) {
                        select.prepend('<option value="null" selected="selected">Please Select</option>');
                    }

                    var d = creamertweet.util.parseDateRaw(creamertweet.scriptDetail.events._lastDate);
                    creamertweet.util.populateYears(editRow.find('.time select.year'), parseInt(d[1], 10));
                    editRow.find('.time select.month').val(--d[2]);
                    editRow.find('.time select.day').val(d[3]);
                    editRow.find('.time select.hour').val(d[4]);
                    editRow.find('.time select.min').val(d[5]);

                    $('#eventsForm').unbind('submit').bind('submit', function() {
                        creamertweet.scriptDetail.events._save(i);
                        return false;
                    });
                    editRow.find('.save a').bind('click', function() {
                        creamertweet.scriptDetail.events._save(i);
                        return false;
                    });
                    editRow.find('.cancel a').bind('click', function() {
                        creamertweet.scriptDetail.events._cancelNew(i);
                        return false;
                    });

                    $('#scriptEvents ul.items').prepend(editRow);
                    creamertweet.scriptDetail.events._curEditing = i;
                },
                _edit: function(i) {
                    creamertweet.scriptDetail.events._cancelCur();
                    creamertweet.scriptDetail.users._cancelCur();

                    var row = $('#scriptEvents #event' + i).eq(0);
                    var editRow = $('#templates .editable-event-row').clone();
                    editRow.attr('id', 'event' + i);

                    var select = editRow.find('.user select');
                    var user = _data['events'][i]['user'];
                    select.append('<option value="null">Please Select user</option>');
                    $.each(_data['users'], function(username, password) {
                        if (username == user) {
                            select.append('<option selected="selected" value="' + username + '">@' + username + '</option>');
                        }
                        else {
                            select.append('<option value="' + username + '">@' + username + '</option>');
                        }
                    });

                    editRow.find('.text textarea').eq(0).val(_data['events'][i]['text']);

                    var d = creamertweet.util.parseDateRaw(_data['events'][i]['time']);
                    creamertweet.util.populateYears(editRow.find('.time select.year'), parseInt(d[1], 10));
                    editRow.find('.time select.month').val(d[2]-1);
                    editRow.find('.time select.day').val(d[3]);
                    editRow.find('.time select.hour').val(d[4]);
                    editRow.find('.time select.min').val(d[5]);

                    $('#eventsForm').unbind('submit').bind('submit', function() {
                        creamertweet.scriptDetail.events._save(i);
                        return false;
                    });
                    editRow.find('.save a').bind('click', function() {
                        creamertweet.scriptDetail.events._save(i);
                        return false;
                    });
                    editRow.find('.cancel a').bind('click', function() {
                        creamertweet.scriptDetail.events._cancel(i);
                        return false;
                    });
                    row.replaceWith(editRow);
                    creamertweet.scriptDetail.events._curEditing = i;
                },
                _save: function(i) {
                    function incpad(i) { ++i; return i<10? ('0'+i) : (''+i); }
                    creamertweet.scriptDetail.events.loading(true);
                    var u = $('#scriptEvents #event' + i + ' .user select').val();
                    var te = $('#scriptEvents #event' + i + ' .text textarea').val();
                    var se = $('#scriptEvents #event' + i + ' .time select');
                    d = {}
                    se.each(function(i, item) {
                        d[item.className] = item.options[item.selectedIndex].value;
                    });
                    var ti = d['year'] + '-'
                              + incpad(d['month']) + '-'
                              + d['day'] + 'T'
                              + d['hour'] + ':'
                              + d['min'] + ':00Z'

                    //[FIXME: better validation]
                    if (!u || u == 'null' || !te || !ti) {
                        alert('Please enter a valid event');
                        creamertweet.scriptDetail.events.loading(false);
                        return false;
                    }
                    creamertweet.scriptDetail.events._lastDate = ti;
                    $.cookie(creamertweet.scriptDetail.events.LAST_DATE_COOKIE_NAME, ti, { path: '/' });

                    if (_data['events'][i]) {
                        _data['events'][i] = { user: u, text: te, time: ti };
                        $.ajax({
                            url: '/script/' + _data['_id'],
                            type: 'POST',
                            data: 'ajax=true&events=' + JSON.stringify(_data['events']),
                            success: function(r) {
                                creamertweet.scriptDetail.events._cancel(i);
                                creamertweet.scriptDetail.events.loading(false);
                                creamertweet.scriptDetail.events.__rebuild_user_index();
                            }
                        });
                    }
                    else {
                        _data['events'][i] = { user: u, text: te, time: ti };
                        $.ajax({
                            url: '/script/' + _data['_id'],
                            type: 'POST',
                            data: 'ajax=true&events=' + JSON.stringify(_data['events']),
                            success: function(r) {
                                r = JSON.parse(r);
                                if (r && r.url) {
                                    document.location = r.url;
                                }
                            }
                        });
                    }
                },
                _cancel: function(i) {
                    var row = creamertweet.scriptDetail.events._renderItem(i, _data['events'][i]);
                    if (row) {
                        var editRow = $('#scriptEvents #event' + i).eq(0);
                        editRow.replaceWith(row);
                        creamertweet.scriptDetail.events._curEditing = -1;
                    }
                    else {
                        creamertweet.scriptDetail.events._cancelNew(i);
                    }
                },
                _delete: function(i) {
                    creamertweet.scriptDetail.events.loading(true);
                    $('#scriptEvents #event' + i).remove();
                    _data['events'].splice(i, 1);
                    $.ajax({
                        url: '/script/' + _data['_id'],
                        type: 'POST',
                        data: 'ajax=true&events=' + JSON.stringify(_data['events']),
                        success: function(r) {
                            creamertweet.scriptDetail.events.loading(false);
                            creamertweet.scriptDetail.events.__rebuild_user_index();
                        }
                    });
                },
                _cancelCur: function() {
                    if (creamertweet.scriptDetail.events._curEditing != -1) {
                        creamertweet.scriptDetail.events._cancel(
                            creamertweet.scriptDetail.events._curEditing
                        );
                    }
                },
                _cancelNew: function(i) {
                    $('#scriptEvents #event' + i).remove();
                    $('#scriptEvents .add').show();
                    creamertweet.scriptDetail.events._curEditing = -1;
                }
            },
            users: {
                DEFAULT_NEW_USERNAME: "\u0948", // high unicode value which is unlikely/illegal to be a real username
                DEFAULT_DISPLAY_PASSWORD: '******',

                _curEditing: -1,

                loading: function(bShow) {
                    if (bShow) {
                        $('#scriptUsers .loading').show();
                    }
                    else {
                        $('#scriptUsers .loading').hide();
                    }
                },
                error: function(m) {
                    $('#scriptUsers .error').html(m);
                },
                render: function(script) {
                    $('#scriptUsers .add a').bind('click', function() {
                        creamertweet.scriptDetail.users._add();
                        return false;
                    });
                    $.each(script['users'], function(username, password) {
                        $('#scriptUsers ul.items').append(
                            creamertweet.scriptDetail.users._renderItem(username, password)
                        );

                    });
                    creamertweet.scriptDetail.users.loading(false);
                },
                _renderItem: function(username, password) {
                    if (!password) {
                        return null;
                    }
                    var row = $('#templates .user-row').clone();
                    row.attr('id', username);

                    // populate item
                    row.find('.username a').eq(0).attr('href', 'http://twitter.com/' + username).html('@' + username);
                    row.find('.password').eq(0).html(creamertweet.scriptDetail.users.DEFAULT_DISPLAY_PASSWORD);

                    // tools
                    row.find('.edit a').bind('click', function() {
                        creamertweet.scriptDetail.users._edit(username);
                        return false;
                    });
                    row.find('.delete a').bind('click', function() {
                        if (creamertweet.scriptDetail.events.__userIndex[username]) {
                            alert('You cannot delete a user which is being used in an event');
                            return false;
                        }
                        if (confirm('Are you sure?')) {
                            creamertweet.scriptDetail.users._delete(username);
                        }
                        return false;
                    });
                    return row;
                },
                _add: function() {
                    creamertweet.scriptDetail.events._cancelCur();
                    creamertweet.scriptDetail.users._cancelCur();

                    $('#scriptUsers .add').hide();

                    var username = creamertweet.scriptDetail.users.DEFAULT_NEW_USERNAME;
                    var row = $('#templates .editable-user-row').clone();
                    row.attr('id', username);

                    $('#usersForm').unbind('submit').bind('submit', function() {
                        creamertweet.scriptDetail.users._save(username);
                        return false;
                    });
                    row.find('.save a').bind('click', function() {
                        creamertweet.scriptDetail.users._save(username);
                        return false;
                    });
                    row.find('.cancel a').bind('click', function() {
                        creamertweet.scriptDetail.users._cancelNew(username);
                        return false;
                    });

                    $('#scriptUsers ul.items.items').prepend(row);
                    creamertweet.scriptDetail.users._curEditing = username;
                },
                _delete: function(username) {
                    creamertweet.scriptDetail.users.loading(true);
                    $('#scriptUsers #' + username).remove();
                    delete _data['users'][username];
                    $.ajax({
                        url: '/script/' + _data['_id'],
                        type: 'POST',
                        data: 'ajax=true&users=' + JSON.stringify(_data['users']),
                        success: function(r) {
                            creamertweet.scriptDetail.users.loading(false);
                        },
                        error: creamertweet.scriptDetail.users.__ajax_err
                    });
                },
                _edit: function(username) {
                    creamertweet.scriptDetail.events._cancelCur();
                    creamertweet.scriptDetail.users._cancelCur();

                    var row = $('#scriptUsers #' + username).eq(0);
                    var editRow = $('#templates .editable-user-row').clone();

                    editRow.attr('id', username);
                    editRow.find('.username input').eq(0).val(username);
                    editRow.find('.password input').eq(0).val(_data['users'][username]);

                    $('#usersForm').unbind('submit').bind('submit', function() {
                        creamertweet.scriptDetail.users._save(username);
                        return false;
                    });
                    editRow.find('.save a').bind('click', function() {
                        creamertweet.scriptDetail.users._save(username);
                        return false;
                    });
                    editRow.find('.cancel a').bind('click', function() {
                        creamertweet.scriptDetail.users._cancel(username);
                        return false;
                    });
                    row.replaceWith(editRow);
                    creamertweet.scriptDetail.users._curEditing = username;
                },
                _save: function(username) {
                    creamertweet.scriptDetail.users.loading(true);
                    var u = $('#scriptUsers #' + username + ' .username input').val();
                    var p = $('#scriptUsers #' + username + ' .password').eq(0).find('input').val();

                    //[FIXME: better validation]
                    if (!u || !p) {
                        alert('Please enter a valid username and password');
                        creamertweet.scriptDetail.users.loading(false);
                        return false;
                    }

                    if (_data['users'][username] || username != creamertweet.scriptDetail.users.DEFAULT_NEW_USERNAME) {
                        delete _data['users'][username];
                        _data['users'][u] = p;
                        $('#' + username).attr('id', u);
                        $.ajax({
                            url: '/script/' + _data['_id'],
                            type: 'POST',
                            data: 'ajax=true&users=' + JSON.stringify(_data['users']),
                            success: function(r) {
                                creamertweet.scriptDetail.users._cancel(u);
                                creamertweet.scriptDetail.users.loading(false);
                            },
                            error: creamertweet.scriptDetail.users.__ajax_err
                        });
                    }
                    else {
                        _data['users'][u] = p;
                        $.ajax({
                            url: '/script/' + _data['_id'],
                            type: 'POST',
                            data: 'ajax=true&users=' + JSON.stringify(_data['users']),
                            success: function(r) {
                                r = JSON.parse(r);
                                if (r && r.url) {
                                    document.location = r.url;
                                }
                            },
                            error: creamertweet.scriptDetail.users.__ajax_err
                        });
                    }
                },
                _cancel: function(username) {
                    var row = creamertweet.scriptDetail.users._renderItem(username, _data['users'][username]);
                    if (row) {
                        var editRow = $('#scriptUsers #' + username).eq(0);
                        editRow.replaceWith(row);
                        creamertweet.scriptDetail.users._curEditing = -1;
                        creamertweet.scriptDetail.users.error('');
                    }
                    else {
                        creamertweet.scriptDetail.users._cancelNew(username);
                    }
                },
                _cancelCur: function() {
                    if (creamertweet.scriptDetail.users._curEditing != -1) {
                        creamertweet.scriptDetail.users._cancel(
                            creamertweet.scriptDetail.users._curEditing
                        );
                    }
                },
                _cancelNew: function(username) {
                    $('#scriptUsers #'  + username).remove();
                    $('#scriptUsers .add').show();
                    creamertweet.scriptDetail.users.error('');
                    creamertweet.scriptDetail.users._curEditing = -1;
                },
                __ajax_err: function(XMLHttpRequest, textStatus, errorThrown) {
                    try {
                        var m = JSON.parse(XMLHttpRequest.responseText).message;
                        creamertweet.scriptDetail.users.error(m);
                    }
                    catch (ex) {
                        alert(textStatus);
                    }
                }
            },
            __toggleEnabled: function(href, bEnabled) {
                $.ajax({
                    url: href,
                    type: 'POST',
                    data: 'ajax=true&enabled=' + bEnabled,
                    success: function(r) {
                        r = JSON.parse(r);
                        if (r && r.url) {
                            document.location = r.url;
                        }
                    }
                });
            }
        },
        twitter: {
            URL_RE: /(http:\/\/[^\s]*)/g,
            USER_RE: /@([^\s]*)/g,

            toHTML: function(s) {
                s = s.replace(creamertweet.twitter.URL_RE, '<a href="$1">$1</a>');
                s = s.replace(creamertweet.twitter.USER_RE, '@<a href="http://twitter.com/$1">$1</a>');
                return s;
            }
        },
        util: {
            MONTH_NAMES: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'August', 'Sep', 'Oct', 'Nov', 'Dec'],
            DATE_RE: /(\d\d\d\d)-(\d\d)-(\d\d).(\d\d):(\d\d)/,

            isEmpty: function(o) {
                for (var p in o) {
                    if (o.hasOwnProperty(p)) {
                        return false;
                    }
                }
                return true;
            },
            ISODateString: function(d) {
                /* from:
                   https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Date */
                function pad(n){return n<10 ? '0'+n : n}
                return d.getUTCFullYear()+'-'
                     + pad(d.getUTCMonth()+1)+'-'
                     + pad(d.getUTCDate())+'T'
                     + pad(d.getUTCHours())+':'
                     + pad(d.getUTCMinutes())+':'
                     + pad(d.getUTCSeconds())+'Z';
            },
            objLen: function(o) {
                var ret = 0;
                for (p in o) {
                    ret++;
                }
                return ret;
            },
            parseDateRaw: function(s) {
                return s.match(creamertweet.util.DATE_RE);
            },
            parseDate: function(s) {
                var m = s.match(creamertweet.util.DATE_RE);
                if (m) {
                    return new Date(Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10)-1, parseInt(m[3], 10), parseInt(m[4], 10), parseInt(m[5], 10), 00));
                }
                return new Date();
            },
            displayDate: function(ISOt) {
                var d = creamertweet.util.parseDateRaw(ISOt);
                var s = ISOt;
                if (d) {
                    var s = d[3];
                    s += '/';
                    s += creamertweet.util.MONTH_NAMES[--d[2]].toUpperCase();
                    s += '/';
                    s += d[1];
                    s += ' ';
                    s += d[4];
                    s += ':';
                    s += d[5];
                }
                return s;
            },
            populateYears: function(select, selected) {
                var y = (new Date()).getFullYear();
                var opts = '';
                for (var i=y; i<(y+5); i++) {
                    if (i == selected) {
                        opts += '<option selected="selected">' + i + '</option>';
                    }
                    else {
                        opts += '<option>' + i + '</option>';
                    }
                }
                select.append(opts);
            },
        }
	}
}();
$(creamertweet.init);

/* util */

