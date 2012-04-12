var express     = require('express')
    , routes    = require('./routes')
    , everyauth = require('everyauth')
    , util      = require('util')
    , conf      = require('./modules/conf')
    , model     = require('./modules/model')
    , Resource  = require('express-resource');

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
    app.use(express.session({cookie: {maxAge: 10 * 60000}, secret: conf.session_secret})); //max age = 10 min
    app.use(everyauth.middleware());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

// Routes
app.all('/users/:user/tasks*', function(req, res, next) {
    console.log('### All route called for tasks URL ###');
    if (req.session && req.session.auth && req.session.auth.userId) {
        //console.log('### Session valid with user info present');
        next();
    } else {
        //console.log('### Session expired');
        model.updateUser({id: req.params.user}, { online: false }, function() {
            res.send(403);
        });
    }
});

app.get('/', routes.index);

var userResource = app.resource('users', require('./modules/users'));
var taskResource = app.resource('tasks', require('./modules/tasks'));
userResource.add(taskResource);

app.listen(conf.app_port);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);