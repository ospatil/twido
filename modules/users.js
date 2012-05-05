var model   = require('./model')
    , util  = require('util');

/* GET -> /users/:user */
exports.show = function(req, res, next) {
    model.findById(req.params.user, function(err, userObj) {
        if (err) {
            console.log('Error fetching user: ' + util.inspect(err));
            next(err);
        } else {
            res.json(userObj);
        }
    });
};