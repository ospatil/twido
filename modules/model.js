var mongoose    = require('mongoose')
    , conf      = require('./conf')
    , util      = require('util')
    , twit      = require('twit')
    , async     = require('async')
    , events    = require('events')
    , status    = require('./status-monitor')
    , Schema    = mongoose.Schema
    , emitter   = new events.EventEmitter();

var self = this;

var TaskSchema = new Schema({
    title       : String,
    isDone      : {type: Boolean, default: false},
    priority    : {type: String, enum: ['now', 'soonish', 'later', 'wish'], default: 'now'},
    from        : {type: String, default: 'own'}
});

var BuddySchema = new Schema({
    id          : String,
    screenName  : String 
});

var UserSchema = new Schema({
    id          : {type: String, index: {unique: true}},
    name        : String,
    screenName  : String,
    email       : String,
    auth        : {
                    accessToken       : String,
                    accessTokenSecret : String
                  },
    tasks       : [TaskSchema],
    buddies     : [BuddySchema]
});

mongoose.connect(conf.db_string);
var User  = mongoose.model('User', UserSchema);
var Task = mongoose.model('Task', TaskSchema);
var Buddy = mongoose.model('Buddy', BuddySchema);

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
            status.monitor.emit('online', user.id);
            //check if accessToken is present, save if notif 
            if (!user.auth || !user.auth.accessToken) {
                user.auth = user.auth || {};
                user.auth.accessToken = accessToken;
                user.auth.accessTokenSecret = accessTokenSecret;

                user.save(function(err) {
                    if (err) {
                        promise.fulfill([err]);
                        return;                        
                    }
                });
            }
            promise.fulfill(user);
        } else { //user needs to be created
            var newUser = new User();
            newUser.id = twitterUserMetadata.id;
            newUser.name = twitterUserMetadata.name;
            newUser.screenName = twitterUserMetadata.screen_name;
            newUser.email = twitterUserMetadata.email;
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
                status.monitor.emit('online', newUser.id);
                promise.fulfill(newUser);
            });
        }
    });
}

exports.findById = function(userId, callback) {
    User.findOne({id: userId}, function(err, user) {
        if (err) {
            console.log('Error fetching user: ' + util.inspect(err));
            callback(new Error('USER_ERR'));  
        } else {
            callback(null, user);
        }
    }); 
}

//Not required anymore since online is no longer part of User collection. Just keeping for reference
/*exports.updateUser = function(conditions, updateVal, callback) {
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
}*/

exports.addTask = function(userid, taskData, callback) {
    self.findById(userid, function(err, userObj) {
        //console.log("req.body = " + util.inspect(req.body));
        //Create new task
        if (err) { //user not found. severe error
            callback(new Error('USER_ERR'));
        } else {
            var newTask = new Task();
            newTask.title = taskData.title;
            newTask.priority = taskData.priority;

            userObj.tasks.push(newTask);
            userObj.save(function(err1) {
                if (err1)  {
                    //console.log('Task added successfully with _id = ' + newTask._id);
                    callback(err1);
                } else {
                    callback(null, newTask);
                }
            });
        }
    });
}

exports.updateTask = function(userid, taskid, taskData, callback) {
    //console.log('Userid = ' + userid + ', taskid = ' + taskid + ', taskData = ' + util.inspect(taskData));
    self.findById(userid, function(err, userObj) {
        //console.log('user exists: ' + util.inspect(userObj));
        if (err) {//User not found. Severe error
            callback(new Error('USER_ERR'));
        } else {
            //find task by id
            var task = userObj.tasks.id(taskid);
            if (taskData.uid) { //move 
                //get new owner
                self.findById(taskData.uid, function(err, newOwner) {
                    if (err) {
                        callback(err);
                    } else { 
                        task.from = userObj.screenName;
                        newOwner.tasks.push(task);
                        newOwner.save(function(err) {
                            if (err)  {
                                callback(err);
                            } else {
                                console.log('Task id ' + task._id + ' moved to user ' + taskData.uid);
                                //remove task from original owner and save it
                                userObj.tasks.id(taskid).remove();
                                userObj.save(function(err) {
                                    if (err)  {
                                        callback(err);
                                    } else {
                                        //console.log('Task' + task._id + ' removed from user ' + userObj.id);
                                        //check if the user is online 
                                        if (status.isOnline(newOwner.id) !== -1) {//user online
                                            status.monitor.emit('taskmove', {uid: newOwner.id, task: task});
                                        } 
                                        callback(null, task);
                                    }
                                });
                            }
                        });
                    }               
                });
            } else {
                task.title = taskData.title;
                task.isDone = taskData.isDone;
                task.priority = taskData.priority;

                userObj.save(function(err) {
                    if (err)  {
                        callback(err);
                    } else {
                        console.log('Task added successfully with _id = ' + task._id);
                        callback(null, task);
                    }
                });            
            }
        }
    });
}

exports.deleteTask = function(userid, taskid, callback) {
    console.log('##### Delete task Userid = ' + userid + ', taskid = ' + taskid);
    self.findById(userid, function(err, userObj) {
        if (err) { //user not found. Severe error
            callback(new Error('USER_ERR'));
        } else {
            console.log('user in delete task = ' + util.inspect(userObj));
            //remove task by id
            userObj.tasks.id(taskid).remove();
            userObj.save(function(err) {
                if (err)  {
                    //console.log('Task removed with _id = ' + task._id);
                    callback(err);
                } else {
                    callback(null);
                } 
            });
        }
    });
}

exports.getBuddies = function(userid, callback) {
    self.findById(userid, function(err, userObj) {
        if (err) { //User not found. Severe error
            callback(new Error('USER_ERR'));
        } else {
            var twitter = new twit({
                consumer_key: conf.tw_consumer_key
              , consumer_secret: conf.tw_consumer_secret
              , access_token: userObj.auth.accessToken
              , access_token_secret: userObj.auth.accessTokenSecret
            });
            //userObj.buddies.length = 0;
            twitter.get('lists/members', { slug: 'mytwido', owner_screen_name: userObj.screenName }, function(err, reply) {
            //twitterDummy('lists/members', { slug: 'mytwido', owner_screen_name: userObj.screenName }, function(err, reply) {
                if (err) {        
                    callback(err);
                } else {
                    async.map(reply.users, processTwitterUser, function(error, results) {
                        if (error) {
                            callback(error);
                        } else {
                            //console.log("Result of Mapping: " + util.inspect(results));
                            userObj.buddies = results;
                            //console.log("looking into user object: " + util.inspect(userObj));
                            userObj.save(function(err) {
                                if (err) {
                                    callback(error);
                                } else {
                                    //console.log('Added buddies to user = ' + userObj.id);
                                    callback(null, results);
                                }
                            });
                        }
                    });
                }
            });
        }
    });
}

function processTwitterUser(twUser, callback) {
    console.log("Received user id = " + twUser.id);
    self.findById(twUser.id, function(err, dbUser) {
        if (err) {
            callback(err);
        } else {
            if (dbUser) { //user found 
                //console.log("DBUser found ..." + util.inspect(dbUser));
                //console.log('Can we access the owner user : ' + util.inspect(userObj));
                //buddies.push({id: dbUser.id, name: dbUser.screen_name});
                var buddy = new Buddy();
                buddy.id = dbUser.id;
                buddy.screenName = dbUser.screenName;
                buddy.online = dbUser.online;
                callback(null, buddy);
            } else {
                //console.log("DBUser not found ...");
                var newUser = new User();
                newUser.id = twUser.id;
                newUser.name = twUser.name;
                newUser.screenName = twUser.screen_name;
                newUser.email = twUser.email;

                newUser.save(function(err) {
                    if (err)  {
                        callback(err);
                    } else {
                        var buddy = new Buddy();
                        buddy.id = twUser.id;
                        buddy.screenName = twUser.screen_name;
                        callback(null, buddy);
                    }
                    console.log("new user saved ...");
                });
            }
        }
    });
}

exports.getMemberOfBuddyList = function(userId, callback) {
    User.where('buddies.id', userId)
        .select('id')
        .run(function(err, docs) {
            //console.log('User ' + userId + ' is member of buddies list of these users : ' + util.inspect(docs));
            if (err) {
                //swallow it. Won't make much of a difference.
            } else {
                if (typeof callback === 'function') {
                    callback(docs);
                }
            }
        });
}

/*function twitterDummy(api, obj, callback) {
    var dummyResp = {
        "users":  [
        {
            "id": 109769209,
            "profile_background_tile": false,
            "listed_count": 1,
            "profile_sidebar_fill_color": "252429",
            "location": "Pune, Maharashtra, India",
            "utc_offset": 19800,
            "name": "Anand Rathi",
            "is_translator": false,
            "time_zone": "Mumbai",
            "profile_image_url_https": "https://si0.twimg.com/profile_images/899319484/Picture_057_normal.jpg",
            "contributors_enabled": false,
            "profile_background_color": "1A1B1F",
            "protected": false,
            "geo_enabled": true,
            "profile_background_image_url_https": "https://si0.twimg.com/profile_background_images/161148939/Me.gif",
            "friends_count": 22,
            "lang": "en",
            "default_profile_image": false,
            "favourites_count": 0,
            "profile_background_image_url": "http://a0.twimg.com/profile_background_images/161148939/Me.gif",
            "statuses_count": 285,
            "show_all_inline_media": false,
            "profile_link_color": "2FC2EF",
            "description": "Software Professional. Proud to be Indian. Hobbies: Sports, Movies and Mimicry.",
            "follow_request_sent": null,
            "verified": false,
            "screen_name": "Anand__Rathi",
            "profile_use_background_image": true,
            "id_str": "109769209",
            "notifications": null,
            "following": null,
            "profile_text_color": "666666",
            "profile_image_url": "http://a0.twimg.com/profile_images/899319484/Picture_057_normal.jpg",
            "status":  {
            "created_at": "Fri Mar 16 11:11:49 +0000 2012",
            "in_reply_to_screen_name": null,
            "place": null,
            "geo": null,
            "retweet_count": 0,
            "in_reply_to_status_id": null,
            "retweeted": false,
            "in_reply_to_user_id": null,
            "truncated": false,
            "id_str": "180612330747478017",
            "coordinates": null,
            "in_reply_to_status_id_str": null,
            "source": "web",
            "contributors": null,
            "id": 180612330747478000,
            "in_reply_to_user_id_str": null,
            "favorited": false,
            "text": "Hurrayyyyyyyyyyyyyyyyyyyyy...Congrats @sachin____rt"
        },
        "default_profile": false,
        "url": null,
        "followers_count": 25,
        "profile_sidebar_border_color": "181A1E",
        "created_at": "Sat Jan 30 05:37:17 +0000 2010"
        },
        {
            "id": 111562435,
            "profile_background_tile": false,
            "listed_count": 1,
            "profile_sidebar_fill_color": "ffffff",
            "location": "Pune",
            "utc_offset": 19800,
            "name": "Anand Bhagwat",
            "is_translator": false,
            "time_zone": "New Delhi",
            "profile_image_url_https": "https://si0.twimg.com/profile_images/1266591739/48_48_normal.png",
            "contributors_enabled": false,
            "profile_background_color": "B2DFDA",
            "protected": false,
            "geo_enabled": false,
            "profile_background_image_url_https": "https://si0.twimg.com/images/themes/theme13/bg.gif",
            "friends_count": 10,
            "lang": "en",
            "default_profile_image": false,
            "favourites_count": 0,
            "profile_background_image_url": "http://a0.twimg.com/images/themes/theme13/bg.gif",
            "statuses_count": 17,
            "show_all_inline_media": false,
            "profile_link_color": "93A644",
            "description": "",
            "follow_request_sent": null,
            "verified": false,
            "screen_name": "abbhagwat",
            "profile_use_background_image": true,
            "id_str": "111562435",
            "notifications": null,
            "following": null,
            "profile_text_color": "333333",
            "profile_image_url": "http://a0.twimg.com/profile_images/1266591739/48_48_normal.png",
            "status":  {
            "created_at": "Wed Aug 24 09:40:46 +0000 2011",
            "in_reply_to_screen_name": null,
            "place": null,
            "geo": null,
            "retweeted_status":  {
              "created_at": "Wed Aug 24 09:39:03 +0000 2011",
              "in_reply_to_screen_name": null,
              "place": null,
              "geo": null,
              "retweet_count": 217,
              "in_reply_to_status_id": null,
              "retweeted": false,
              "in_reply_to_user_id": null,
              "truncated": false,
              "id_str": "106299471519956993",
              "coordinates": null,
              "in_reply_to_status_id_str": null,
              "source": "<a href='http://blackberry.com/twitter' rel='nofollow'>Twitter for BlackBerry®</a>",
              "contributors": null,
              "id": 106299471519957000,
              "in_reply_to_user_id_str": null,
              "favorited": false,
              "text": "Without effective lokayukts we will need an Anna in each State. Is it too much to ask of our elected representatives?"
            },
            "retweet_count": 217,
            "in_reply_to_status_id": null,
            "retweeted": false,
            "in_reply_to_user_id": null,
            "truncated": false,
            "id_str": "106299904602812416",
            "coordinates": null,
            "in_reply_to_status_id_str": null,
            "source": "web",
            "contributors": null,
            "id": 106299904602812420,
            "in_reply_to_user_id_str": null,
            "favorited": false,
            "text": "RT @thekiranbedi: Without effective lokayukts we will need an Anna in each State. Is it too much to ask of our elected representatives?"
        },
        "default_profile": false,
        "url": null,
        "followers_count": 12,
        "profile_sidebar_border_color": "eeeeee",
        "created_at": "Fri Feb 05 10:54:59 +0000 2010"
        }
    ],
    "next_cursor": 0,
    "previous_cursor": 0,
    "next_cursor_str": "0",
    "previous_cursor_str": "0"
    };
    callback(null, dummyResp);
}*/