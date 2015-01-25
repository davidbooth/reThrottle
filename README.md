# ReThrottle

 Request Throttling Middleware for ExpressJS
 
 Limits a unique ip address to a certain number of requests per second.

###Version:
0.1.0

Uses Redis for volatile (LRU) cache. (http://redis.io/download)


###Config:
* **redisPort**: 6379 - Port of your redis instance.
* **redisMaxMemoryInBytes**: 2000 - Maximum amount of Memory Redis will use for cache. (Eviction: volatile-lru)
* **intervalInSeconds**: 1 - How much time in seconds an ip address has to reach limit.
* **successCallback**: fn(req, res, next) - Callback if the request was accepted.
* **failureCallback**: fn(req, res, next) - Callback if the request was rejected.
* **maxRequestsPerInterval**: 30 - How many requests are allowed in the given interval.

For example:
* 30req/sec = intervalInSeconds: 1, maxRequestsPerInterval:30. 
    Will allow a maximum of 30 requests per second.

* 30req/sec = intervalInSeconds: 10, maxRequestsPerInterval: 300. 
    Will allow at most 300 requests in a period of 10 seconds.
    e.x: Allows burst of 300 requests in the first second, 
    and will reject all requests for the remaining 9 seconds.
    Over an interval of 10 seconds the average req/sec rate is 30.




###Examples:
**Simple Usage:**

    app.use(reThrottle.throttle);
    
Will use the following defaults:
* Request Limit of 10 req/sec.
* On Success: next()
* On Failure: res.status(503).send("Server is busy at the moment, try again.");
* Redis Port: 6379
* Redis MaxMemory: 100mb



** Example of configuration: **

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




