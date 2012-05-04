var io              = require('socket.io')
    , async         = require('async')
    , status        = require('./modules/status-monitor')
    , model         = require('./modules/model')
    , parseCookie   = require('connect').utils.parseCookie
    , app           = null
    , sessionStore  = null;

module.exports = function(appl, store) {
    app = appl;
    sessionStore = store;

    var sio = io.listen(app);

    sio.configure('production', function() {
        sio.enable('browser client minification');  // send minified client
        sio.enable('browser client etag');          // apply etag caching logic based on version number
        sio.enable('browser client gzip');          // gzip the file
        sio.set('log level', 1);                    // reduce logging
        sio.set('transports', [                     // enable all transports (optional if you want flashsocket)
            'websocket'
            , 'flashsocket'
            , 'htmlfile'
            , 'xhr-polling'
            , 'jsonp-polling'
        ]);
    });

    sio.set('authorization', function (data, accept) {
        if (data.headers.cookie) {
            data.cookie = parseCookie(data.headers.cookie);
            data.sessionID = data.cookie['connect.sid'];
            // get the session data from the session store
            sessionStore.get(data.sessionID, function (err, session) {
                if (err || !session) {
                    // if we cannot grab a session, turn down the connection
                    accept('Error', false);
                } else {
                    // save the session data and accept the connection
                    data.session = session;
                    accept(null, true);
                }
            });
        } else {
           return accept('No cookie transmitted.', false);
        }
    });

    status.monitor.on('taskmove', function(data) {
        //console.log('taskmove callback called ...' + util.inspect(data));
        sio.sockets.in(data.uid).emit('taskmove', data.task);
    });
     
    sio.sockets.on('connection', function (socket) {
        if (socket.handshake.session && socket.handshake.session.auth && socket.handshake.session.auth.userId) {
            var userId = socket.handshake.session.auth.userId;
            console.log('A socket with userId ' + userId + ' connected!');

            //create a separate room for the user
            socket.join(userId);

            //Send the list of buddies of this user are that are online
            model.findById(userId, function(user) {
                //console.log('Getting buddies of ' + userId + util.inspect(user.buddies));
                var buddyIds = [];
                for(var i = 0; i < user.buddies.length; i++) {
                    buddyIds.push(user.buddies[i].id);
                }
                var onlineBuddies = status.getOnlineUsers(buddyIds);
                //sio.sockets.in(userId).emit('init', {online : onlineBuddies});
                if (onlineBuddies.length > 0) {
                    sio.sockets.in(userId).emit('init', {online : onlineBuddies});
                }
            }); 

            //Find all the users which have this user in their buddy list and notify them 
            model.getMemberOfBuddyList(userId, function(userIds) {
                async.forEach(userIds, function(item, cb) {
                    console.log('Notifying user : ' + item);
                    sio.sockets.in(item.id).emit('online', userId);
                    cb();
                }, null);
            });
        }

        socket.on('disconnect', function () {
            console.log('A socket with UserId ' + userId + ' disconnected!');
            model.getMemberOfBuddyList(userId, function(userIds) {
                async.forEach(userIds, function(item, cb) {
                    sio.sockets.in(item.id).emit('offline', userId);
                    cb();
                }, null);
            });        
        });
    });
}