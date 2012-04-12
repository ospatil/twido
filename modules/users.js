var model   = require('./model')
    , util  = require('util');

/* GET -> /users/:user */
exports.show = function(req, res) {
    model.findById(req.params.user, function(userObj) {
        //console.log('Got user : ' + util.inspect(userObj));
        res.json(userObj);
    });
};