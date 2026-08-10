const mongoose = require('mongoose'); 

const counterSchema = new mongoose.Schema({
    _id : {
        type : String, 
    }, 
    counter : {
        type : Number, 
        default : 10000
    }
}); 

const Counter = mongoose.model('Counter', counterSchema); 

module.exports = Counter; 