const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
// const axios = require("axios");

const amqplib = require('amqplib');
const { v4: uuid4} = require("uuid");

const { APP_SECRET, MESSAGE_BROKER_URL, EXCHANGE_NAME, SHOPPING_SERVICE_BINDING_KEY, QUEUE_NAME } = require("../config");

//Utility functions
module.exports.GenerateSalt = async () => {
  return await bcrypt.genSalt();
};

module.exports.GeneratePassword = async (password, salt) => {
  return await bcrypt.hash(password, salt);
};

module.exports.ValidatePassword = async (
  enteredPassword,
  savedPassword,
  salt
) => {
  return (await this.GeneratePassword(enteredPassword, salt)) === savedPassword;
};

module.exports.GenerateSignature = async (payload) => {
  try {
    return await jwt.sign(payload, APP_SECRET, { expiresIn: "30d" });
  } catch (error) {
    console.log(error);
    return error;
  }
};

module.exports.ValidateSignature = async (req) => {
  try {
    const signature = req.get("Authorization");
    console.log(signature);
    const payload = await jwt.verify(signature.split(" ")[1], APP_SECRET);
    req.user = payload;
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

module.exports.FormateData = (data) => {
  if (data) {
    return { data };
  } else {
    throw new Error("Data Not found!");
  }
};


//Raise Events
// module.exports.PublishCustomerEvent = async (payload) => {
//   axios.post("http://localhost:8000/customer/app-events/", {
//     payload,
//   });

//   //     axios.post(`${BASE_URL}/customer/app-events/`,{
//   //         payload
//   //     });
// };


//************Communication using RabbitMq(message broker) **********//

//create a channel
let amqplibConnection = null;

const getChannel = async()=>{
  if(amqplibConnection === null){
    amqplibConnection = await amqplib.connect(MESSAGE_BROKER_URL);
  }
  return await amqplibConnection.createChannel();
};

module.exports.CreateChannel = async()=>{
  try{
   const channel = await get();
   //creating an exchange 
   await channel.assertExchange(EXCHANGE_NAME, 'direct', {
     durable: false
   });
   return channel;
  }catch(err){
   console.log("Error while creating channel", err);
  }
 }
 
 //publish message
 
 module.exports.PublishMessage = async(channel, binding_key, message)=>{
  try{
     await channel.publish(EXCHANGE_NAME, binding_key, Buffer.from(message));
     console.log("Message has been published from shopping service", message);
  }catch(err){
   console.log("Error while publishing message", err);
  }
 }
 
 //consume message
 module.exports.ConsumeMessage = async(channel, service)=>{
   try{
   const appQueue = channel.assertQueue(QUEUE_NAME);
   channel.bindQueue(appQueue.queue, EXCHANGE_NAME, SHOPPING_SERVICE_BINDING_KEY);
   channel.consume(appQueue.queue, data=>{
     console.log("data received in shopping service");
     console.log(data.content.toString());

     //subscribe the events
     service.SubscribeEvents(data.content.toString());

     channel.ack(data);
   })
   }catch(err){
    console.log("Error while consume message", err);
   }
 }


const requestData = async(RPC_QUEUE_NAME, requestPayload, uuid)=>{
    const channel = await getChannel();

    const q = await channel.assertQueue("", {exclusive:true}); //gives temporary queue

    channel.sendToQueue(RPC_QUEUE_NAME, Buffer.from(JSON.stringify(requestPayload)),{
        replyTo:q.queue,
        correlationId: uuid
    });

    return new Promise((resolve, reject)=>{

      //timeout of n seconds , after that we won't accept the data
      const timeout = setTimeout(()=>{
        channel.close();
        resolve("API could not fulfill the request!");
      },8000);
        channel.consume(q.queue, (msg)=>{
            if(msg.properties.correlationId === uuid){
                resolve(JSON.parse(msg.content.toString()));
                clearTimeout(timeout);
            }else{
                reject("Data not found!!");
            }
        },{
            noAck: true
        })
    })
}

module.exports.RPCRequest = async(RPC_QUEUE_NAME, requestPayload)=>{
  const uuid = uuid4(); //correlationId
  return requestData(RPC_QUEUE_NAME, requestPayload, uuid);
};


