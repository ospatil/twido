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
exports.create = function(req, res) {
    model.addTask(req.params.user, req.body, function(newTask) {
        res.json(newTask);
    });
};

/* PUT /users/:user/tasks/:task */
exports.update = function(req, res) {
    model.updateTask(req.params.user, req.params.task, req.body, function(newTask) {
        res.json({'success': true});
    });
};

/* DELETE /users/:user/tasks/:task */
exports.destroy = function(req, res) {
    model.deleteTask(req.params.user, req.params.task, function() {
        res.json({'success': true});
    });
};