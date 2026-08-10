const redis = require('../config/redis'); 
const {sendError} = require('../utils/response') 

const rateLimiter = (endPointName, windowSeconds, limit) => {
    return async (req, res, next) => {
        try{
            const ip = req.ip || 'Unknown'; 
            const cacheKey = `rateLimit-${endPointName}-${ip}`; 
            const cnt = await redis.incr(cacheKey); 
            if(cnt === 1){
                await redis.expire(cacheKey, windowSeconds); 
            }
            if(cnt > limit){
                console.log('Blocked IP, rate limit reached:', ip)
                return sendError(res, 429, 'Too many requests, Try again later...');
            }
            next(); 
        }catch(err){
            console.error('ERROR-rateLimitError', err.message); 
            next();
        }
    }
}; 

module.exports = rateLimiter; 