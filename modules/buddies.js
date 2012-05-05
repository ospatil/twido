var model       = require('./model')
    , async     = require('async')
    , status    = require('./status-monitor');

/* GET -> /users/:user/buddies */
exports.index = function(req, res, next) {
    model.getBuddies(req.params.user, function(err, buddies) {
        if (err) {
            next(err);
        } else {
            async.forEach(buddies, function(buddy, cb){
                if (status.isOnline(buddy.id) !== -1) {//buddy online
                    buddy.online = true;
                }
                cb();
            }, null);
            res.json(buddies);
        }
    });
};