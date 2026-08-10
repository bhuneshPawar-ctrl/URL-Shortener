const mongoose = require('mongoose'); 
const validator = require('validator');

const urlSchema = new mongoose.Schema({
    longUrl : {
        type : String, 
        unique : true, 
        required : true,
        maxLength : [500, 'Maximum length exceeded'],
        validate(value){
            if(!validator.isURL(value, {require_protocol : true})){
                throw new Error('Invalid URL');
            };
        },
    }, 
    shortCode : {
        type : String, 
        unique : true, 
        required : true,
    },
}, {
    timestamps : true
}); 

const Url = mongoose.model('Url', urlSchema);

module.exports = Url; 