var express         = require('express')
    , routes        = require('./routes')
    , everyauth     = require('everyauth')
    , util          = require('util')
    , conf          = require('./modules/conf')
    , model         = require('./modules/model')
    , Resource      = require('express-resource')
    , gzippo        = require('gzippo')
    , io            = require('socket.io')
    , async         = require('async')
    , status        = require('./modules/status-monitor')
    , parseCookie   = require('connect').utils.parseCookie
    , sessionStore  = new express.session.MemoryStore();

var app = module.exports = express.createServer();

require('./modules/auth');

// Configuration
app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.set('view options', {
        layout: false
    });

    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.session({cookie: {maxAge: 15 * 60000}, store: sessionStore, secret: conf.session_secret})); //max age = 10 min
    app.use(everyauth.middleware());
    app.use(express.methodOverride());
    app.use(app.router);
    //app.use(express.static(__dirname + '/public'));
    //app.use(gzippo.staticGzip(__dirname + '/public'));
});

app.configure('development', function(){
    app.use(express.static(__dirname + '/public'));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(gzippo.staticGzip(__dirname + '/public'));
    app.use(express.errorHandler());
});

// Routes
app.all('/users/:user/tasks*', function(req, res, next) {
    doSessionCheck(req, res, next);
});

app.all('/main', function(req, res, next) {
    doSessionCheck(req, res, next);
});

var doSessionCheck = function(req, res, next, callback) {
    var statusCode = -1;
    if (req.session && req.session.auth && req.session.auth.userId) {
        //check if the url contains uid, if it does it's a page refresh after login, don't allow it
        //console.log("query param = " + req.query.uid);

        if (req.query.uid && req.query.uid != req.session.auth.userId) {
            statusCode = 400;
        }
    } else {
        statusCode = 403;
    }
    if (statusCode != -1) {
        //destry session if still active
        if (statusCode == 400) {
            if (req.session) {
                req.session.destroy();
            }
        }
        status.monitor.emit('offline', req.params.user);
        res.send(statusCode);
    } else {
        if(typeof callback === 'function') {
            callback(req, res);
        }
        next();
    }

}

app.get('/', routes.index);
app.get('/main', routes.main);

var userResource = app.resource('users', require('./modules/users'));
var taskResource = app.resource('tasks', require('./modules/tasks'));
var buddyResource = app.resource('buddies', require('./modules/buddies'));
userResource.add(taskResource);
userResource.add(buddyResource);

app.listen(conf.app_port);

console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

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
 
sio.sockets.on('connection', function (socket) {
    var userId = socket.handshake.session.auth.userId;
    console.log('A socket with userId ' + userId + ' connected!');
    //create a separate room for the user
    socket.join(userId);

    //Send the list of buddies of this user are that are online
    model.findById(userId, function(user) {
        console.log('Getting buddies of ' + userId + util.inspect(user.buddies));
        var buddyIds = [];
        for(var i = 0; i < user.buddies.length; i++) {
            buddyIds.push(user.buddies[i].id);
        }
        var onlineBuddies = status.getOnlineUsers(buddyIds);
        //sio.sockets.in(userId).emit('init', {online : onlineBuddies});
        sio.sockets.in(userId).emit('init', {online : onlineBuddies});
    }); 

    //Find all the users which have this user in their buddy list and notify them 
    model.getMemberOfBuddyList(userId, function(userIds) {
        async.forEach(userIds, function(item, cb) {
            sio.sockets.in(item).emit('online', userId);
            cb();
        }, null);
    });

    status.monitor.on('taskmove', function(data) {
        //console.log('taskmove callback called ...' + util.inspect(data));
        sio.sockets.in(data.uid).emit('taskmove', data.task);
    });

    socket.on('disconnect', function () {
        console.log('A socket with UserId ' + userId + ' disconnected!');
        model.getMemberOfBuddyList(userId, function(userIds) {
            async.forEach(userIds, function(item, cb) {
                sio.sockets.in(item).emit('offline', userId);
                cb();
            }, null);
        });        
    });
});