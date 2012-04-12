var everyauth   = require('everyauth')
    , conf      = require('./conf')
    , util      = require('util')
    , model     = require('./model');

//everyauth.debug = true;

/*everyauth.facebook
    .performRedirect( function (res, location) {
        console.log("##### custom redirect #####");
        //console.log(util.inspect(req));
        res.header('custom', 'test');
        res.redirect(location, 303);
    });*/

everyauth.twitter.sendResponse(function(res, data) {
    //console.log('##### sendResponse custom step START #####\n'); 
    //check if uid is already present in the url, if yes, remove it
    var redirectPath = this.redirectPath();
    var uidIndex = redirectPath.indexOf('#');
    if (uidIndex > 0 ) {
        redirectPath = redirectPath.substring(0, uidIndex);
    }
    this.redirectPath(redirectPath + '#uid/' + data.user.id);
    //console.log('##### sendResponse custom step END #####\n'); 
    //Your custom logic here
    this._super();
});

/*TODO - change the url to include userid so that userid 
undefined exception in case of session expiry can be avoided
*/
everyauth.everymodule.handleLogout( function (req, res) {
    var self = this;
    var userId = null;
    console.log('Param received in logout req = ' + req.query.uid);
    if (req.session && req.session.auth && req.session.auth.userId) {
        userId = req.session.auth.userId;
    } else {
        userId = req.query.uid;
    }
    model.updateUser({id: userId}, { online: false }, function() {
        req.logout();
        // And/or put your extra logic here
        self.redirect(res, self.logoutRedirectPath());
    });
});

everyauth
    .twitter
    .consumerKey(conf.tw_consumer_key)
    .consumerSecret(conf.tw_consumer_secret)
    .findOrCreateUser( function (session, accessToken, accessTokenSecret, twitterUserMetadata) {
        //console.log(util.inspect(twitterUserMetadata));
        promise = this.Promise();
        model.findOrCreateByMetaData(accessToken, accessTokenSecret, twitterUserMetadata, promise);
        return promise;
    })
    .redirectPath('/');

everyauth.everymodule.moduleErrback( function (err) {
    throw err;
});    