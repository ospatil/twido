var model   = require('./model')
    , util  = require('util');

/* GET -> /tasks */
/*exports.index = function(req, res) {

};*/

/* POST -> /users/:user/tasks/:task */
/*exports.show = function(req, res) {
    res.send('user: ' + req.params.user + ', task: ' + req.params.task);
};*/

/* POST -> /users/:user/tasks */
exports.create = function(req, res, next) {
    model.addTask(req.params.user, req.body, function(err, newTask) {
        if (err) {
            next(err);
        } else {
            res.json(newTask);
        }
    });
};

/* PUT /users/:user/tasks/:task */
exports.update = function(req, res, next) {
    model.updateTask(req.params.user, req.params.task, req.body, function(err, newTask) {
        if (err) {
            next(err);
        } else {
            res.json({'success': true});
        }
    });
};

/* DELETE /users/:user/tasks/:task */
exports.destroy = function(req, res, next) {
    model.deleteTask(req.params.user, req.params.task, function(err) {
        if (err) {
            next(err);
        } else {
            res.json({'success': true});
        } 
    });
};