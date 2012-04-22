exports.index = function(req, res) {
    //console.log("Route index -> Req URL = " + req.url);
    res.render('index');
};

exports.main = function(req, res) {
    //console.log("Route index -> Req URL = " + req.url);
    res.render('main');
};