var events  = require('events')
    und     = require('underscore');

var self = this;
var online = [];

exports.monitor = new events.EventEmitter();

self.monitor.on('online', function(uid) {
    online.push(uid); 
}); 

self.monitor.on('offline', function(uid) {
    online = und.without(online, uid);
;});

exports.getOnlineUsers = function(buddiesArray) {
    //console.log('getOnlineUsers result = ' + und.intersection(online, buddiesArray));
    return und.intersection(online, buddiesArray);
}

exports.isOnline = function(userId) {
    return und.indexOf(online, userId);
}
