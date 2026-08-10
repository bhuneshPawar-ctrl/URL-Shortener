const redis = require('../config/redis'); 
const {sendError} = require('../utils/response') 

const rateLimiter = (endPointName, windowSeconds, limit) => {
    return async (req, res, next) => {
        try{
            // 1. Extract the REAL client IP from the cloud headers
            let ip = req.headers['x-forwarded-for'] || req.ip || 'Unknown';
            // If it's a list of IPs (e.g., "ClientIP, Proxy1, Proxy2"), grab the first one
            if (ip.includes(',')) {
                ip = ip.split(',')[0].trim();
            }
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