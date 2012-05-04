var express         = require('express')
    , everyauth     = require('everyauth')
    , util          = require('util')
    , conf          = require('./modules/conf')
    , Resource      = require('express-resource')
    , gzippo        = require('gzippo')
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
    app.use(express.logger('[:date] :method :url :status - :response-time ms'));
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

require('./routes/routes')(app);

app.listen(conf.app_port);

console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

require('./socket-server')(app, sessionStore);