const { OrderModel, CartModel, WishlistModel } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { APIError, BadRequestError, STATUS_CODES } = require('../../utils/app-errors')
const _ = require("lodash");


//Dealing with data base operations
class ShoppingRepository {

    // payment
   
    async Orders(customerId, orderId){
        try{
          if(orderId){
            return await OrderModel.findOne({_id: orderId});
          }else{
            const orders = await OrderModel.findOne({customerId });        
            return orders;
          }
        }catch(err){
            throw APIError('API Error', STATUS_CODES.INTERNAL_ERROR, 'Unable to Find Orders')
        }
    } 

    async ManageCart(customerId, product, qty, isRemove=false) {
        try {
          const cart = await CartModel.findOne({customerId});

          if(cart){
            if(isRemove){
                //handle remove functionality
                const cartItems  = _.filter(cart.items, (item) => item.product._id !== product._id);
                cart.items = cartItems;
            }else{
                //handle add functionality in existing cart
              const cartIndex = _.findIndex(cart.items, {product: { _id: product._id} });
              if(cartIndex > -1){
                //if product already exist
                cart.items[cartIndex].qty = qty;
              }else{
                cart.items.push({product:{...product}, unit: qty})
              }
            }
            return await cart.save();
          }else{
            //create a new cart
            return await CartModel.create({
                customerId,
                items:[{
                    product:{
                        ...product
                    },
                    unit:qty
                }]
            });
          }
        } catch (err) {
          throw new APIError(
            "API Error",
            STATUS_CODES.INTERNAL_ERROR,
            "Unable to add to cart"
          );
        }
    }

    //wishlist
    async ManageWishlist(customerId, productId, isRemove =false) {
      try {
        const wishlist = await WishlistModel.findOne({customerId});

        if(wishlist){
          if(isRemove){
              //handle remove functionality
              const products  = _.filter(wishlist.products, (item) => item._id !== productId);
              wishlist.products = products;
          }else{
              //handle add functionality in existing cart
            const wishlistIndex = _.findIndex(wishlist.products,  { _id: productId,});
            if(wishlistIndex < 0){
              wishlist.populated.push({_id: productId});
            }
          return await wishlist.save();
        }}else{
          //create a new wishlist
          return await WishlistModel.create({
              customerId,
              products:[{
                  _id: productId
              }]
          });
        }
      } catch (err) {
        throw new APIError(
          "API Error",
          STATUS_CODES.INTERNAL_ERROR,
          "Unable to add to wishlist"
        );
      }
  }

  async getWishlistById(customerId){
    return await WishlistModel.findOne({ customerId });
  }

    async Cart(customerId){
        try{
            const cartItems = await CartModel.find({ customerId: customerId });
            if(cartItems){
                return cartItems;
            }
            throw new Error('Data not Found');
        }catch(err){
          throw err;
        }
        
    }
 
 
    async CreateNewOrder(customerId, txnId){

        //check transaction for payment Status
        
        try{
            //required to verify payment through TxnId

        const cart = await CartModel.findOne({ customerId: customerId })

        if(cart){         
            
            let amount = 0;   

            let cartItems = cart.items;

            if(cartItems.length > 0){
                //process Order
                
                cartItems.map(item => {
                    amount += parseInt(item.product.price) *  parseInt(item.unit);   
                });
    
                const orderId = uuidv4();
    
                const order = new OrderModel({
                    orderId,
                    customerId,
                    amount,
                    status: 'received',
                    items: cartItems
                })
    
                cart.items = [];
                
                const orderResult = await order.save();
                await cart.save();
                return orderResult;


            }
        }

        return {}

        }catch(err){
            throw APIError('API Error', STATUS_CODES.INTERNAL_ERROR, 'Unable to Find Category')
        }
        

    }

    async DeleteProfileData(customerId){
      return await Promise.all([
        CartModel.findByIdAndDelete({customerId}),
        WishlistModel.findByIdAndDelete({customerId})
      ])
    }
}

module.exports = ShoppingRepository;