const express = require('express');

//express app
const app = express();

//middleware
app.use(express.json()); // so that server recognize request object as Json Object.

//APIs
app.use('/',(req, res)=>{
    return res.status(200).send("Customer Service Home Page !!");
});


app.listen(8001, ()=>{
    console.log(`[Server]: Customer Service is running on port 8001`);
});