const express = require('express');
const router = express.Router(); 
const {sendSuccess, sendError} = require('../utils/response');
const Url = require('../models/url');
const redis = require('../config/redis');
const Analytics = require('../models/analytics')

router.get('/totalClicks/:shortCode', async (req, res) => {
    try{
        const shortCode = req.params.shortCode; 
        if(!shortCode){
            return sendError(res, 400, 'Provide URL to get totalClicks');
        }
        const cacheKey = `${shortCode}-clicks`;
        const cachedDoc = await redis.get(cacheKey); 
        if(cachedDoc){
            return sendSuccess(res, 200, 'totalClicks fetched successfully', { totalClicks : cachedDoc.totalClicks}); 
        }
        const analyticsDoc = await Analytics.findOne({shortCode : shortCode});
        if(!analyticsDoc){
            return sendError(res, 400, 'Url does not exist'); 
        }
        const totalClicks = analyticsDoc.totalClicks; 
        await redis.set(cacheKey, {totalClicks : totalClicks}, {ex : 60}); 
        sendSuccess(res, 200, 'totalClicks fetched successfully', { totalClicks : totalClicks}); 
    }catch(err){
        console.error('ERROR-fetchTotalClicks', err.message); 
        sendError(res, 500, 'Something happened while fetching totalClicks')
    }
})

module.exports = router; 