const ShoppingService = require("../services/shopping-service");
const UserAuth = require('./middlewares/auth');
const { PublishCustomerEvent } = require("../utils");

module.exports = (app) => {
    
    const service = new ShoppingService();

    app.post('/order',UserAuth, async (req,res,next) => {

        const { _id } = req.user;
        const { txnNumber } = req.body;


        try {
            const { data } = await service.PlaceOrder({_id, txnNumber});

            //get payload data to send to customer service
            const payload= await service.GetOrderPayload(_id, data, 'CREATE_ORDER');
            PublishCustomerEvent(payload); //calling the create order event of customer service

            return res.status(200).json(data);
            
        } catch (err) {
            next(err)
        }

    });

    app.get('/orders',UserAuth, async (req,res,next) => {

        const { _id } = req.user;

        try {
            const { data } = await service.GetOrders(_id);
            return res.status(200).json(data);
        } catch (err) {
            next(err);
        }

    });
       
    
    app.get('/cart', UserAuth, async (req,res,next) => {

        const { _id } = req.user;
        try {
            const { data } = await service.GetCart(_id);
            return res.status(200).json(data);
        } catch (err) {
            next(err);
        }
    });
}