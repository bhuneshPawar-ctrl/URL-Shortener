const mongoose = require('mongoose'); 

const analyticsSchema = new mongoose.Schema({
    shortCode : {
        type : String,
        unique : true, 
        required : true
    }, 
    totalClicks : {
        type : Number, 
        default : 0
    }, 
    clickHistory : [{
        userAgent : {
            type : String, 
        }, 
        timeStamp : {
            type : Date, 
            default : Date.now, // not Date.now() will run only once for 'npm run dev',the same result for all the values.So we give function reference, not called value.
        }
    }]
})

const Analytics = mongoose.model('Analytics', analyticsSchema)

module.exports = Analytics; 