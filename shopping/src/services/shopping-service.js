const { ShoppingRepository } = require("../database");
const { FormateData, RPCRequest } = require("../utils");

// All Business logic will be here
class ShoppingService {

    constructor(){
        this.repository = new ShoppingRepository();
    }

    //cart info
    async AddCartItem(customerId, productId, qty){
        //Grab the product from product service through rpc
        const productResponse= await RPCRequest("PRODUCT_RPC", {
            type:"VIEW_PRODUCT",
            data: productId
        }); //TODO add RPC codes
        if(productResponse && productResponse._id){
          const data = await this.repository.ManageCart(customerId, productResponse, qty);
          return data;
        }
        throw new Error("product data not found!");
    };

    async RemoveCartItem(customerId, productId){
        return await this.repository.ManageCart(customerId, {_id:productId}, 0, true);
    };

    async GetCart(_id){  
        const cartItems = await this.repository.Cart(_id);
        return FormateData(cartItems);
    }

    //wishlist
    async AddToWishlist(customerId, productId){
      return  this.repository.ManageWishlist(customerId, productId);
    }

    async RemoveFromWishlist(customerId, productId){
        return  this.repository.ManageWishlist(customerId, productId, true);

    }

    async GetWishlist(customerId){
       //performs RPC call
       const wishlist = await this.repository.getWishlistById(customerId);

       if(!wishlist) return {};

       const {products} = wishlist;

       if(Array.isArray(products)){
         const ids = products.map(({_id}) => _id);
         //perform RPC call
         const productResponse = await RPCRequest("PRODUCT_RPC", {
            type:"VIEW_PRODUCTS",
            data:ids
         });
         if(productResponse){
            return productResponse;
         }
       }

       return {};
    }

    //orders
    async CreateOrder(customerId, txnNumber){

        // const { _id, txnNumber } = userInput

        const orderResult = await this.repository.CreateNewOrder(customerId, txnNumber);
        
        return FormateData(orderResult);
    }



    async GetOrder(orderId){
        
        const orders = await this.repository.Orders("",orderId);
        return FormateData(orders)
    }

    async GetOrders(customerId){
        const orders = await this.repository.Orders(customerId);
        return FormateData(orders)
    }

    async ManageCart(customerId, item,qty, isRemove){

        const cartResult = await this.repository.ManageCart(customerId,item,qty, isRemove);
        return FormateData(cartResult);
    }

    async DeleteProfileData(customerId){
       return await this.repository.DeleteProfileData(customerId); 
    }
     

    async SubscribeEvents(payload){

        //parse the data got from message broker
        payload = JSON.parse(payload);
 
        const { event, data } = payload;
        // const { userId, product, qty } = data;
        
        switch(event){
            // case 'ADD_TO_CART':
            //     this.ManageCart(userId, product, qty, false);
            //     break;
            // case 'REMOVE_FROM_CART':
            //     this.ManageCart(userId,product, qty, true);
            //     break;
            case 'DELETE_PROFILE':
                await  this.DeleteProfileData(data.userId);
            default:
                break;
        }
 
    }


//     async GetOrderPayload(userId,order,event){

//        if(order){
//             const payload = { 
//                event: event,
//                data: { userId, order }
//            };

//             return payload
//        }else{
//            return FormateData({error: 'No Order Available'});
//        }

//    }

 

}

module.exports = ShoppingService;