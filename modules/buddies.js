var model       = require('./model')
    , async     = require('async')
    , status    = require('./status-monitor');

/* GET -> /users/:user/buddies */
exports.index = function(req, res) {
    model.getBuddies(req.params.user, function(buddies) {
        async.forEach(buddies, function(buddy, cb){
            if (status.isOnline(buddy.id) !== -1) {//buddy online
                buddy.online = true;
            }
            cb();
        }, null);
        res.json(buddies);
    });
};