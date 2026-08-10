const express = require('express'); 
const router = express.Router();
const Url = require('../models/url')
const Analytics = require('../models/analytics')
const {sendSuccess, sendError} = require('../utils/response');
const redis = require('../config/redis');
const rateLimiter = require('../middlewares/rateLimiter')

router.delete('/remove/:shortCode',rateLimiter('remove', 60, 10), async (req, res) => {
    try{
        const shortCode = req.params.shortCode; 
        if(!shortCode){
            return sendError(res, 400, 'Provide URL to remove');
        }
        // we want to first delete from cache
        // If we deleted first from db and then deletion from cache failed : 
            // our cache will still consist stale entry, while its not there in our DB.
            // means "server says deleted, but the link secretly still works" — worse, because it contradicts what your system claims.
        // Else if its in db but not in cache: 
            // re-populates the cache. The link keeps working — not what you intended, but at least it's not lying about being deleted.
        const rediskey1 = `${shortCode}-clicks`;
        const rediskey2 = `${shortCode}-longUrl`;
        const deleteFromRedis = await redis.del(rediskey1, rediskey2); 
        const deleteFromUrl = async () => await Url.deleteOne({shortCode : shortCode});
        const deleteFromAnalytics = async () => await Analytics.deleteOne({shortCode : shortCode})
        // using Promise.all() makes it faster as the time taken is the maximum of two, if we were to use await individually the time would be sum of the two.
        // we didn't include redis deletion in promise.all(), as it does not guarantee the execution order as everything in it fires simultaneousl(runs parallel).
        // we can use Promise.allSettled() too for more safety.it waits for all four to finish regardless of individual success/failure, and gives you back the status of each one individually.
        const [deletionAnalyticsRes, deletionUrlRes] = await Promise.all([
            deleteFromAnalytics(), deleteFromUrl()
        ]);
        sendSuccess(res, 200, `${shortCode} removed from DB and cache.`, {deletionUrlRes, deletionAnalyticsRes, deleteFromRedis})
    }catch(err){
        console.error('ERROR - deletion:', err.message); 
        sendError(res, 500, 'SOmething happened during deltion from DB')
    }
}); 

module.exports = router; 