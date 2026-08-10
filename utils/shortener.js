const Url = require('../models/url');
const Counter = require('../models/counter');
const { nanoid } = require('nanoid');

const SHORT_CODE_LEN = 6;
const NANOID_LEN = 21; 

const getShortCode = async (method) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let shortCode = '';
    const res = [];
    if(method === 'random'){
        const l = chars.length;
        let found = false; 
        while(!found){
            for(let i = 0; i < SHORT_CODE_LEN; i ++){
                const idx = Math.floor(Math.random()*l); 
                res.push(chars[idx])
            }
            shortCode = res.join(''); 
            const url = await Url.findOne({shortCode : shortCode})
            if(!url){
                found = true;
            }else{
                res.length = 0;
            }
        }
    }else if(method === 'base62'){
        let counterDoc = await Counter.findByIdAndUpdate(
            "counter_id",
            { $inc : {counter : 1}},
            { returnDocument : 'after', upsert : true}
        );
        let num = counterDoc.counter + 10000; 
        console.log('---- counter :', num);
        let rem = 0;
        while(num > 0){
            rem = num % 62 
            res.push(chars[rem]);
            num = Math.floor(num / 62); 
        }
        shortCode = res.join(''); 
    }else if(method === 'nanoid'){
        shortCode = nanoid(NANOID_LEN); 
    }
    return shortCode; 
};  

module.exports = getShortCode;