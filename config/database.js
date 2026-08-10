const mongoose = require('mongoose'); 
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI; 
const connectDB = async () => {
    await mongoose.connect(MONGO_URI);
}

module.exports = connectDB;