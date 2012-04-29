var smoosh = require('smoosh');

smoosh.make({
    "VERSION": "0.0.1",
    "JSHINT_OPTS": { "boss": true, "forin": true, "browser": true },
    "JAVASCRIPT": {
    "DIST_DIR": "./public/javascripts",
    "smoosh": [ "./public/javascripts/lib/bootstrap.min.js", "./public/javascripts/lib/jquery.jnotify.min.js", "./public/javascripts/lib/jquery.url.js", "./public/javascripts/lib/knockout-2.0.0.js" ],
    "smoosh-client-app": [ "./public/javascripts/client-app.js" ]
    },
    "CSS": {
        "DIST_DIR": "./public/stylesheets",
        "smoosh": ["./public/stylesheets/jquery.jnotify.min.css", "./public/stylesheets/jquery-ui-1.8.19.custom.css" ],
        "smoosh-client-app" : [ "./public/stylesheets/client-app.css" ]
    }/*,
    "CSS": {
        "DIST_DIR": "./public/stylesheets/css",
        "smoosh-bootstrap": ["./public/stylesheets/css/bootstrap.min.css", "./public/stylesheets/css/bootstrap-responsive.min.css"]
    }*/
});