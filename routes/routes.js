var status  = require('../modules/status-monitor')
    , util  = require('util')
    , app   = null;

module.exports = function(appl) {
    app = appl;
    //console.dir(app);

    var doSessionCheck = function(req, res, next, callback) {
        var statusCode = -1;
        if (req.session && req.session.auth && req.session.auth.userId) {
            //check if the url contains uid, if it does it's a page refresh after login, don't allow it
            //console.log("doSessionCheck --- query param = " + req.query.uid);

            if (req.query.uid && req.query.uid != req.session.auth.userId) {
                //console.log('doSessionCheck --- sending status code 400');
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

    // Routes
    app.all('/users/:user/tasks*', function(req, res, next) {
        doSessionCheck(req, res, next);
    });

    app.all('/main*', function(req, res, next) {
        //console.log('/main* interceptor invoked ------');
        doSessionCheck(req, res, next);
    });

    app.get('/', function(req, res) {
        //console.log("Route index -> Req URL = " + req.url);
        res.render('index');
    });
    
    app.get('/main*', function(req, res) {
        //console.log("Route index -> Req URL = " + req.url);
        res.render('main');
    });

    var userResource = app.resource('users', require('../modules/users'));
    var taskResource = app.resource('tasks', require('../modules/tasks'));
    var buddyResource = app.resource('buddies', require('../modules/buddies'));
    userResource.add(taskResource);
    userResource.add(buddyResource);    
}