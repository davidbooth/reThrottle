/*
    ReThrottle

    Version: 0.1.0

    Request Throttling Middleware for ExpressJS
    Limits a unique ip address to a certain number of requests per second.

    Uses Redis for volatile (LRU) cache.
    (http://redis.io/download)


    Config:
        redisPort: 6379 - Port of your redis instance.

        redisMaxMemoryInBytes: 2000 - Maximum amount of Memory Redis will use for cache. (Eviction: volatile-lru)
        
        intervalInSeconds: 1 - How much time in seconds an ip address has to reach limit.

        maxRequestsPerInterval: 30 - How many requests are allowed in the given interval.
        For example: 
            30req/sec = intervalInSeconds: 1, maxRequestsPerInterval:30 
            Will allow a maximum of 30 requests per second.

            30req/sec = intervalInSeconds: 10, maxRequestsPerInterval: 300 
            Will allow at most 300 requests in a period of 10 seconds.
            e.x: Allows burst of 300 requests in the first second, 
            and will reject all requests for the remaining 9 seconds.
            Over an interval of 10 seconds the average req/sec rate is 30.
    

        successCallback: fn(req, res, next) - Callback if the request was accepted.
        failureCallback: fn(req, res, next) - Callback if the request was rejected.
    });


    Examples:

    ************************
    Simple Usage:
        app.use(reThrottle.throttle);
    
        Will use the following defaults:
        - Request Limit of 10 req/sec.
        - On Success: next()
        - On Failure: res.status(503).send("Server is busy at the moment, try again.");
        - Redis Port: 6379
        - Redis MaxMemory: 100mb

    ************************

    ************************
    Example of configuration: 
        (Allow 1 request every 10 seconds foreach unique ip, with custom success and fail callbacks)

        reThrottle.config({
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
    ************************

*/

var redis   = require("redis");
var rClient = null;

//Default values
var settings = {
    maxRequestsPerInterval : 10, 
    intervalInSeconds      : 1,
    successCallback        : null,
    failureCallback        : null,
    redisPort              : 6379,
    redisMaxMemoryInBytes  : 100 *(1024*1024) //Default 100mb
};


//Connect and configure redis
var init = function init(){
    rClient = redis.createClient(settings.redisPort);

    //Configure redis
    rClient.config("SET", "maxmemory", settings.redisMaxMemoryInBytes); //Set max memory
    rClient.config("SET", "save", ""); //Disable save to disk

    rClient.on("error", function (err) {
        console.error("[reThrottle] Redis Error: " + err);
    });
}


// Accepts config object tho override settings object
var config = function config(object){
    settings = extend(settings, object);

    //Start redis
    if(rClient === null){
        init();
    }
}

var throttle = function throttle(req, res, next){

    //Start redis
    if(rClient === null){
        init();
    }

    var ip = req.connection.remoteAddress;

    //Get number of hits from this ip.
    rClient.hget(ip, "hits", function(err, hits){

        if(err){
            console.error("[reThrottle] Redis Error: " + err);
            return;
        }

        hits = parseInt(hits || 0);

        if(hits < settings.maxRequestsPerInterval){

            //User is under given limit, lets increase hit count.
            rClient.hset(ip, "hits", hits+1);
            rClient.expire(ip, settings.intervalInSeconds);

            //If a custom successCallback was defined call it.
            if(settings.successCallback){
                settings.successCallback(req, res, next);
            }
            else{
                next();
            }
        }
        else{
            //User has reached limit 

            //Call custom fail callback if defined.
            if(settings.failureCallback){
                settings.failureCallback(req, res, next);
            }
            else{
                res.status(503).send("Server is busy at the moment, try again.");
            }

        }

    });

}

//Extends properties from source into obj, and will return obj.
var extend = function extend(obj, source){

    for(var item in source){
        if(source.hasOwnProperty(item)){
            obj[item] = source[item];
        }
    }

    return obj;

}

module.exports = {
    throttle:throttle,
    config: config
}