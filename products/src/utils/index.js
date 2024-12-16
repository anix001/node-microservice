const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
// const axios = require('axios');
const amqplib = require('amqplib');
const { v4: uuid4} = require("uuid");


const { APP_SECRET, MESSAGE_BROKER_URL, EXCHANGE_NAME } = require("../config");

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

//Raise Events (communication using axios(http calls))
// module.exports.PublishCustomerEvent = async (payload) => {
//   axios.post("http://localhost:8000/customer/app-events/", {
//     payload,
//   });
// };

// module.exports.PublishShoppingEvent = async (payload) => {
//   axios.post(`http://localhost:8000/shopping/app-events/`, {
//     payload,
//   });
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
  const channel = await getChannel();
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
    console.log("Message has been published from product service", message);
 }catch(err){
  console.log("Error while publishing message", err);
 }
}

//consume message
module.exports.ConsumeMessage = async(channel, service, binding_key)=>{
  try{
  const appQueue = channel.assertQueue(QUEUE_NAME);
  channel.bindQueue(appQueue.queue, EXCHANGE_NAME, binding_key);
  channel.consume(appQueue.queue, data=>{
    console.log("data received");
    console.log(data.content.toString());
    channel.ack(data);
  })
  }catch(err){
   console.log("Error while consume message", err);
  }
}

//observe the activity like if you are sending something from client, will perform some operation based on condition and respond
module.exports.RPCObserver = async(RPC_QUEUE_NAME, service)=>{
   const channel = await getChannel();
   //creating a queue
   await channel.assertQueue(RPC_QUEUE_NAME,{
    durable:false,
   });

   channel.prefetch(1);
   channel.consume(RPC_QUEUE_NAME, async(msg)=>{
    if(msg.content){
        //DB operation
      const payload  = JSON.parse(msg.content.toString());
      const response = await service.serveRPCRequest(payload);

      channel.sendToQueue(
        msg.properties.replyTo,
        Buffer.from(JSON.stringify(response)),
        {
            correlationId: msg.properties.correlationId
        }
      );

      channel.ack(msg);

    }
   },{
    noAck: false,
   })
};

