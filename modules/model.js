var mongoose    = require('mongoose')
    , conf      = require('./conf')
    , util      = require('util')
    , Schema    = mongoose.Schema;

var self = this;

var TaskSchema = new Schema({
    title     : String,
    isDone    : {type: Boolean, default: false},
    priority  : {type: String, enum: ['now', 'soonish', 'later', 'wish'], default: 'now'}
});

var UserSchema = new Schema({
    id          : {type: String, index: {unique: true}},
    name        : String,
    screenName  : String,
    email       : String,
    online      : {type: Boolean, default: false},
    auth        : {
                    accessToken       : String,
                    accessTokenSecret : String
                  },
    tasks       : [TaskSchema]
});

mongoose.connect(conf.db_string);
var User  = mongoose.model('User', UserSchema);
var Task = mongoose.model('Task', TaskSchema);

exports.findOrCreateByMetaData = function(accessToken, accessTokenSecret, twitterUserMetadata, promise) {
    User.findOne({id: twitterUserMetadata.id}, function(err, user) {
        if (err) {
            //console.log("Error fetching user");
            console.log(err);
            promise.fulfill([err]);
            return;            
        }
        if (user) { //user exists
            //console.log('user exists: ' + util.inspect(user));
            self.updateUser({id: user.id}, { online: true });
            promise.fulfill(user);
        } else { //user needs to be created
            var newUser = new User();
            newUser.id = twitterUserMetadata.id;
            newUser.name = twitterUserMetadata.name;
            newUser.screenName = twitterUserMetadata.screen_name;
            newUser.email = twitterUserMetadata.email;
            newUser.online = true;
            newUser.auth = {};
            newUser.auth.accessToken = accessToken;
            newUser.auth.accessTokenSecret = accessTokenSecret;

            newUser.save(function(err) {
                if (err) {
                  //console.log("Error using users:");
                  //console.log(err);
                  promise.fulfill([err]);
                  return;
                }
                //console.log('user created: ' + util.inspect(newUser));
                promise.fulfill(newUser);
            });
        }
    });
}

exports.findById = function(userId, callback) {
    User.findOne({id: userId}, function(err, user) {
        if (err) {
            //console.log("Error fetching user");
            //console.log(err);
            throw err;  
        }
        if (user) { //user exists
            //console.log('user exists: ' + util.inspect(user));
            callback(user);
        }
    }); 
}

exports.updateUser = function(conditions, updateVal, callback) {
    var options = { multi: false },
        update = {$set: updateVal};
    User.update(conditions, updateVal, options, function(err, numAffected) {
        //console.log('numAffected : ', numAffected);
        if (err) {
            throw err;
        }
    });
    if (typeof callback === 'function') {
        callback();
    }
}

exports.addTask = function(userid, taskData, callback) {
    self.findById(userid, function(userObj) {
        //console.log("req.body = " + util.inspect(req.body));
        //Create new task
        var newTask = new Task();
        newTask.title = taskData.title;
        newTask.priority = taskData.priority;

        userObj.tasks.push(newTask);
        userObj.save(function(err) {
            if (!err)  {
                //console.log('Task added successfully with _id = ' + newTask._id);
                callback(newTask);
            } else {
                throw err;
            }
        });
    });
}

exports.updateTask = function(userid, taskid, taskData, callback) {
    //console.log('Userid = ' + userid + ', taskid = ' + taskid + ', taskData = ' + util.inspect(taskData));
    self.findById(userid, function(userObj) {
        //console.log('user exists: ' + util.inspect(userObj));
        //find task by id
        var task = userObj.tasks.id(taskid);
        task.title = taskData.title;
        task.isDone = taskData.isDone;
        task.priority = taskData.priority;

         userObj.save(function(err) {
            if (!err)  {
                console.log('Task added successfully with _id = ' + task._id);
                callback(task);
            } else {
                throw err;
            }
        });
    });
}

exports.deleteTask = function(userid, taskid, callback) {
    console.log('##### Delete task Userid = ' + userid + ', taskid = ' + taskid);
    self.findById(userid, function(userObj) {
        //remove task by id
        userObj.tasks.id(taskid).remove();

         userObj.save(function(err) {
            if (!err)  {
                //console.log('Task removed with _id = ' + task._id);
                callback();
            } else {
                throw err;
            }
        });
    });
}