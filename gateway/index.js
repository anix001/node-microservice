const express = require('express');
const cors = require('cors');
const proxy = require('express-http-proxy'); //Express middleware to proxy request to another host and pass response back to original caller

const app = express();

//middleware
app.use(cors());
app.use(express.json());

//redirect to original service
app.use('/customer', proxy('http://localhost:8001'));
app.use('/shopping', proxy('http://localhost:8003'));
app.use('/', proxy('http://localhost:8002')); //products


//server starting on port 8000
app.listen(8000, ()=>{
    console.log(`[Server]: Api Gateway is running on port 8000`);
})