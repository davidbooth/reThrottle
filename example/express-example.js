var express    = require('express')
var app        = express()
var reThrottle = require('../reThrottle.js');

//Optional configuration
reThrottle.config({
    // redisPort: 6380,
    redisMaxMemoryInBytes: 200,
    intervalInSeconds: 10,
    maxRequestsPerInterval: 1,
    successCallback: function(req, res, next){
        console.log("You passed this time...");
        next();
    },
    failureCallback: function(req, res, next){
        console.log("USER HAS REACHED REQUEST LIMIT.");
        res.status(503).send("Check back later...");
    }
});

app.use(reThrottle.throttle);


app.get('/', function (req, res) {
  res.send('Hello World!');
})


var server = app.listen(3000, function () {

  console.log('Example app listening at 3000')

})