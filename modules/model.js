var mongoose    = require('mongoose')
    , conf      = require('./conf')
    , util      = require('util')
    , twit      = require('twit')
    , async     = require('async')
    , Schema    = mongoose.Schema;

var self = this;

var TaskSchema = new Schema({
    title     : String,
    isDone    : {type: Boolean, default: false},
    priority  : {type: String, enum: ['now', 'soonish', 'later', 'wish'], default: 'now'}
});

var BuddySchema = new Schema({
    id          : String,
    screenName  : String,
    online      : {type: Boolean, default: false} 
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
        //if (user) { //user exists
            //console.log('user exists: ' + util.inspect(user));
        callback(user);
        //}
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
    console.log('Userid = ' + userid + ', taskid = ' + taskid + ', taskData = ' + util.inspect(taskData));
    self.findById(userid, function(userObj) {
        //console.log('user exists: ' + util.inspect(userObj));
        //find task by id
        var task = userObj.tasks.id(taskid);
        
        if (taskData.uid) { //move 
            //get new owner
            self.findById(taskData.uid, function(newOwner) {
                newOwner.tasks.push(task);
                newOwner.save(function(err) {
                    if (!err)  {
                        console.log('Task id ' + task._id + ' moved to user ' + taskData.uid);
                        //remove task from original owner and save it
                        userObj.tasks.id(taskid).remove();
                        userObj.save(function(err) {
                            if (!err)  {
                                //console.log('Task' + task._id + ' removed from user ' + userObj.id);
                                //may be a twitter direct message can be sent
                                callback(task);
                            } else {
                                throw err;
                            }
                        });
                    } else {
                        throw err;
                    }
                });                
            });
        } else {
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
        }
    });
}

exports.deleteTask = function(userid, taskid, callback) {
    //console.log('##### Delete task Userid = ' + userid + ', taskid = ' + taskid);
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

exports.getBuddies = function(userid, callback) {
    self.findById(userid, function(userObj) {
        var twitter = new twit({
            consumer_key: conf.tw_consumer_key
          , consumer_secret: conf.tw_consumer_secret
          , access_token: userObj.auth.accessToken
          , access_token_secret: userObj.auth.accessTokenSecret
        });
        //userObj.buddies.length = 0;
        //twitter.get('lists/members', { slug: 'mygnie', owner_screen_name: userObj.screenName }, function(err, reply) {
        twitterDummy('lists/members', { slug: 'mygnie', owner_screen_name: userObj.screenName }, function(err, reply) {
            if (!err) {        
                async.map(reply.users, processTwitterUser, function(error, results) {
                    console.log("Result of Mapping: " + util.inspect(results));
                    userObj.buddies = results;
                    console.log("looking into user object: " + util.inspect(userObj));
                    userObj.save(function(err) {
                        if (err) {
                            throw err;
                        } else {
                            console.log('Added buddies to user = ' + userObj.id);
                            callback(results);
                        }
                    });
                });
            } else {
                //console.log('something went wrong ...' + util.inspect(err));
                throw err;
            }
        });
    });
}

function processTwitterUser(twUser, callback) {
    console.log("Received user id = " + twUser.id);
    self.findById(twUser.id, function(dbUser) {
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
                    throw err;
                } else {
                    var buddy = new Buddy();
                    buddy.id = twUser.id;
                    buddy.screenName = twUser.screen_name;
                    callback(null, buddy);
                }
                console.log("new user saved ...");
            });
        }
    });
}

function twitterDummy(api, obj, callback) {
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
}