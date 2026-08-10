const express = require('express');
require('dotenv').config({ quiet : true });
const app = express(); 
const connectDB = require('./config/database'); 
const urlShortenerRouter = require('./routers/shortenUrlRouter')
const editDBRouter = require('./routers/editDB');
const analyticsRouter = require('./routers/analyticsRouter'); 
const {sendSuccess, sendError} = require('./utils/response');

const PORT = process.env.PORT || 3000; 

connectDB().then(() => {
    console.log('DB connected successfully!!...')
    app.listen(PORT, () =>{
        console.log(`Server is listening at port: ${PORT}`);
    })
}).catch((err) => console.error('ERROR during db connection:', err)); 

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json({ limit: '10kb' }));
// This tells Express to read the real client IP out of the X-Forwarded-For header Render's proxy sets, rather than trusting the connection's immediate source
app.set('trust proxy', 1); // req.ip can report a reverse proxy's address instead of the real client's, unless Express is told to trust the proxy.

app.use('/editDB', editDBRouter); 
app.use('/', urlShortenerRouter); 
app.use('/', analyticsRouter);


app.get('/', (req, res, next) => {
    console.log('--- this is home ---');
    return sendSuccess(res, 200, 'This is Home Page', {} );
})

app.use((req, res) => {
    return sendError(res, 404, 'Route does not exist');
})

app.use((err, req, res, next) => {
    if(err){
        console.error('ERROR - global error handeler', err);
        return sendError(res, 500, 'Unexpected Error'); 
    }
    next(); 
}); 



