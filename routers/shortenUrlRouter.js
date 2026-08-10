const express = require('express');
const router = express.Router(); 
// const userAuth = require('../middlewares/auth'); 
const {sendSuccess, sendError} = require('../utils/response');
const Url = require('../models/url');
const getShortCode = require('../utils/shortener');
const validator = require('validator');
const redis = require('../config/redis');
const Analytics = require('../models/analytics')
const rateLimiter = require('../middlewares/rateLimiter')

const URL_SHORTENER_METHODS = ['random', 'base62', 'nanoid'];
const METHOD_IDX = 1; 

router.post('/shorten', rateLimiter('shorten', 60, 3), async (req, res) => {
    try{
        const {longUrl} = req.body;
        if(!longUrl){
            return sendError(res, 400, 'Provide URL to shorten');
        }
        if(!validator.isURL(longUrl, {require_protocol : true})){
            return sendError(res, 400, 'Provide a valid URL.')
        }
        const url = await Url.findOne({longUrl : longUrl});
        const selected_method = METHOD_IDX < URL_SHORTENER_METHODS.length ? URL_SHORTENER_METHODS[METHOD_IDX] : 'nonoid';
        let shortCode = '';
        if(url){
            shortCode = url.shortCode; 
        }else{
            shortCode = await getShortCode(selected_method); 
            await Url.create({
                shortCode, 
                longUrl
            });
        }
        sendSuccess(res, 200, 'Url shortened successfully', { shortCode });
    }catch(err){
        console.error('ERROR - url shortening:',err.message);
        sendError(res, 400, 'Something went wrong during url shortening')
    }
})

router.get('/:shortCode', async (req, res) => {
    try{
        const shortCode = req.params.shortCode; 
        if(!shortCode){
            return sendError(res, 400, 'provide the short code');
        }
        const cacheKeyLongUrl = `${shortCode}-longUrl`; 
        const cachedLongUrl = await redis.get(cacheKeyLongUrl);
        let longUrl = '';
        if (cachedLongUrl) {
            // Cache HIT 🚀
            longUrl = cachedLongUrl; 
        }else{
            // Cache MISS 🐢
            const urlDoc = await Url.findOne({ shortCode : shortCode}); 
            if(!urlDoc){
                return sendError(res, 404, `Link not found for ${shortCode}`);
            }
            await redis.set(cacheKeyLongUrl, urlDoc.longUrl, { ex: 3600 });
            longUrl = urlDoc.longUrl; 
        }
        res.redirect(longUrl);
        // update analytics_db for analytics in background , we dont wait for it to finish, it can take its time 
        // we have already sent the required response
        const userAgent = req.headers['user-agent'] || 'Unknown';
        Analytics.findOneAndUpdate({
            shortCode : shortCode
        }, {
            $inc : {totalClicks : 1},
            $push : {clickHistory : {userAgent : userAgent}}
        }, {
            upsert : true, 
        }).catch((err) => {
            console.error('ERROR-backgroundClickUpdation', err.message)
        }); 

    }catch(err){
        console.error('ERROR - redirection:',err.message);
        if(!res.headersSent){
            sendError(res, 500, 'Something went wrong during url redirection');
        }
    }
})

module.exports = router;