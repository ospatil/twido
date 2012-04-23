var express     = require('express')
    , routes    = require('./routes')
    , everyauth = require('everyauth')
    , util      = require('util')
    , conf      = require('./modules/conf')
    , model     = require('./modules/model')
    , Resource  = require('express-resource')
    , gzippo    = require('gzippo');

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
    app.use(express.session({cookie: {maxAge: 15 * 60000}, secret: conf.session_secret})); //max age = 10 min
    app.use(everyauth.middleware());
    app.use(express.methodOverride());
    app.use(app.router);
    //app.use(express.static(__dirname + '/public'));
    app.use(gzippo.staticGzip(__dirname + '/public'));
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
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

        model.updateUser({id: req.params.user}, { online: false }, function() {
            res.send(statusCode);
        });
    } else {
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