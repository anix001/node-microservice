const express = require('express');

//express app
const app = express();

//middleware
app.use(express.json()); // so that server recognize request object as Json Object.

//APIs
app.use('/',(req, res)=>{
    return res.status(200).send("Product Service Home Page !!");
});


app.listen(8002, ()=>{
    console.log(`[Server]: Product Service is running on port 8002`);
});