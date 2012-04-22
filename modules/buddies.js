var model   = require('./model');

/* GET -> /users/:user/buddies */
exports.index = function(req, res) {
    model.getBuddies(req.params.user, function(buddies) {
        res.json(buddies);
    });
};