const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);



const express = require('express')
const cors = require('cors');
const app = express()
const port = 5000
require('dotenv').config()

app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");













app.get('/' , (req,res) => {
    res.send('hello world')
})  



const uri = process.env.MONGO_DB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// async function run() {
//   try {
//     // Connect the client to the server	(optional starting in v4.7)
//     await client.connect();

client.connect(()=> {
  console.log('connecting to Mongodb')
}).catch(console.dir)

// --------collection-------------
const database = client.db("Assignment_10_db");
const productCollection = database.collection("products");
const sellerCollection = database.collection("sellerProfiles");
const paymentCollection = database.collection("payments");
const wishlistCollection = database.collection("wishlist");

const buyerCollection = database.collection("buyerProfiles");
const orderCollection = database.collection("orders");
const userCollection = database.collection("user");
const sessionCollection = database.collection("session");



// varification relatel................

const verifyToken = async (req, res, next) => {

console.log('headers' , req.headers);

const authHeader = req.headers?.authorization;
if (!authHeader){
  return res.status(401).send({message:'unautorized access'})
}
const token = authHeader.split(' ')[1]
if(!token){
  return res.status(401).send({message:'unautorized access'})

}

const query = { token: token}
const session = await sessionCollection.findOne(query)
const userId = session.userId

const userQuery = {
  _id :userId
}
const user = await userCollection.findOne(userQuery)

req.user = user

next();
};

const verifyBuyer = async (req,res,next)=>{
if(req.user?.role !== 'buyer'){
    return res.status(401).send({message:'unautorized access'})

}
  next();

  console.log(req.user)
}

const verifySeller = async (req,res,next)=>{
if(req.user?.role !== 'seller'){
    return res.status(401).send({message:'unautorized access'})

}
  next();

  console.log(req.user)
}
const verifyAdmin = async (req,res,next)=>{
if(req.user?.role !== 'admin'){
    return res.status(401).send({message:'unautorized access'})

}
  next();

  console.log(req.user)
}






// -------------------admin-------------------------

// 📊 অ্যাডমিন ড্যাশবোর্ড ওভারভিউ ডাটা এপিআই
app.get('/api/admin/stats',verifyToken,verifyAdmin, async (req, res) => {
  try {
    // ডাটাবেজ থেকে দ্রুত কাউন্ট করার জন্য estimatedDocumentCount ব্যবহার করা হয়েছে
    const totalProducts = await productCollection.estimatedDocumentCount();
    const totalOrders = await orderCollection.estimatedDocumentCount();
    
    // বায়ার এবং সেলার কালেকশনের মোট যোগফলই হলো টোটাল ইউজার
    const totalBuyers = await buyerCollection.estimatedDocumentCount();
    const totalSellers = await sellerCollection.estimatedDocumentCount();
    const totalUsers = totalBuyers + totalSellers;

    res.send({
      success: true,
      data: {
        totalUsers,
        totalProducts,
        totalOrders
      }
    });
  } catch (error) {
    res.status(500).send({ 
      success: false, 
      error: error.message 
    });
  }
});





// const { ObjectId } = require('mongodb'); // চেক করে নিস এই লাইনটা ওপরে আছে কিনা

app.get("/api/admin/users",verifyToken,verifyAdmin, async (req, res) => {
  try {
    const { search, role } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          email: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    if (role) {
      query.role = role;
    }

    const users = await userCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    const formattedUsers = users.map((user) => ({
      ...user,
      status: user.status || "Active",
    }));

    res.send({
      success: true,
      data: formattedUsers,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      error: error.message,
    });
  }
});



app.patch("/api/admin/users/status",verifyToken,verifyAdmin, async (req, res) => {
  try {
    const { id, status } = req.body;

    const result = await userCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          status,
        },
      }
    );

    res.send({
      success: true,
      message: `User status updated to ${status}`,
      result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      error: error.message,
    });
  }
});



app.delete("/api/admin/users/:id",verifyToken,verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await userCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    await userCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.send({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      error: error.message,
    });
  }
});



// admin manage product-------------
// app.get("/api/admin/products", async (req, res) => {
//   try {
//     const products = await productCollection.find().toArray();

//     res.send({
//       success: true,
//       data: products,
//     });
//   } catch (err) {
//     res.status(500).send({
//       success: false,
//       message: err.message,
//     });
//   }
// });



app.get("/api/admin/products",verifyToken,verifyAdmin, async (req, res) => {
  try {
    const { search, status } = req.query;

    const query = {};

    if (search) {
      query.ProductTitle = {
        $regex: search,
        $options: "i",
      };
    }

    if (status) {
      query.status = status;
    }

    const products = await productCollection
      .find(query)
      .sort({ _id: -1 })
      .toArray();

    res.send({
      success: true,
      data: products,
    });
  } catch (err) {
    res.status(500).send({
      success: false,
      message: err.message,
    });
  }
});


app.patch("/api/admin/products/approve/:id",verifyToken,verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await productCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          status: "approved",
        },
      }
    );

    res.send({
      success: true,
      result,
    });
  } catch (err) {
    res.status(500).send({
      success: false,
      message: err.message,
    });
  }
});


app.patch("/api/admin/products/reject/:id",verifyToken,verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await productCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          status: "rejected",
        },
      }
    );

    res.send({
      success: true,
      result,
    });
  } catch (err) {
    res.status(500).send({
      success: false,
      message: err.message,
    });
  }
});




// admin manage orders--------------
app.get("/api/admin/orders",verifyToken,verifyAdmin, async (req, res) => {
  try {
    const orders = await orderCollection
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.send({
      success: true,
      data: orders,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});








// product---------
app.get("/api/products", async (req, res) => {
  console.log("PRODUCT API HIT");
  try {
    const { sellerId, status } = req.query;

    const query = {};

    if (sellerId) {
      query.sellerId = sellerId;
    }

    if (status) {
      query.status = status;
    }

    const products = await productCollection.find(query).toArray();

    res.send({
      success: true,
      data: products,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});


// 🎯 হোম পেজের জন্য লেটেস্ট ৬টি প্রোডাক্ট নিয়ে আসার API
app.get("/api/products/featured", async (req, res) => {
  try {
    const featuredProducts = await productCollection
      .find()                       // সব প্রোডাক্ট খুঁজবে (আপনার ইচ্ছামতো এখানে {status: "approved"} দিতে পারেন)
      .sort({ _id: -1 })            // একদম নতুন আপলোড হওয়া প্রোডাক্ট সবার আগে আসবে
      .limit(6)                     // সবসময় সর্বোচ্চ ৬টি প্রোডাক্টে লক থাকবে
      .toArray();

    res.send({
      success: true,
      data: featuredProducts,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});


app.get("/api/products/:id", async (req, res) => {
  const { id } = req.params;

  const result = await productCollection.findOne({
    _id: new ObjectId(id),
  });

  res.send(result);
});



// ..........product add 


// app.post('/api/products', verifyToken ,async (req, res) => {
//   try {
//     const product = req.body;

//     // 🔒 সিকিউরিটি লক: ফ্রন্টএন্ড থেকে পাঠানো সেলার আইডির বদলে টোকেন ভেরিফাইড আইডি নেওয়া সবচেয়ে নিরাপদ
//     product.sellerId = req.user.sub; // Better-Auth এ 'sub' এর ভেতরেই ইউজার আইডি থাকে

//     const result = await productCollection.insertOne(product);
    
//     // ✅ ফ্রন্টএন্ডের 'res.json()' এর সাথে ম্যাচ করার জন্য সঠিক JSON রেসপন্স
//     return res.status(201).json({
//       success: true,
//       message: "Product verified and added successfully!",
//       data: result
//     });
//   } catch (error) {
//     console.error("Insert product error:", error.message);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// });




app.post("/api/products",verifyToken, async (req, res) => {
  try {
    const product = req.body;

    const result = await productCollection.insertOne(product);

    return res.status(201).json({
      success: true,
      message: "Product added successfully!",
      data: result,
    });
  } catch (error) {
    console.error("Insert product error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});




// const { createRemoteJWKSet, jwtVerify } = require("jose");

// const JWKS = createRemoteJWKSet(
//   new URL(`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/auth/jwks`)
// );

// const verifyToken = async (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;

//     if (!authHeader?.startsWith("Bearer ")) {
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized: No token provided",
//       });
//     }

//     const token = authHeader.split(" ")[1];

//     const { payload } = await jwtVerify(token, JWKS);

//     if (payload.role !== "seller") {
//       return res.status(403).json({
//         success: false,
//         message: "Forbidden: Seller only",
//       });
//     }

//     req.user = payload;

//     next();
//   } catch (err) {
//     console.error("JWT Verify Error:", err);

//     return res.status(401).json({
//       success: false,
//       message: "Unauthorized: Invalid token",
//     });
//   }
// };






app.patch("/api/products/:id/decrease-stock", async (req, res) => {
  try {
    const { id } = req.params;

    const product = await productCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!product) {
      return res.status(404).send({
        message: "Product not found",
      });
    }

    if (product.Stock <= 0) {
      return res.status(400).send({
        message: "Out of stock",
      });
    }

    const result = await productCollection.updateOne(
      {
        _id: new ObjectId(id),
        Stock: { $gt: 0 },
      },
      {
        $inc: {
          Stock: -1,
        },
      }
    );

    res.send(result);
  } catch (error) {
    res.status(500).send({
      error: error.message,
    });
  }
});



// -------------buyer profile

// ১. বায়ার প্রোফাইল গেট করা (buyerId দিয়ে)
app.get('/api/buyerProfile/:buyerId' , verifyToken , verifyBuyer , async (req, res) => {
  try {
    const query = {}
    if(req.query.buyerId){
      query.buyerId = req.query.buyerId;
      console.log(req.user , req.user.buyerId)

   if(req.user._id.toString() !== req.query.buyerId)
    return res.status(403).send({message : 'forbidden messege'})
    }





    const { buyerId } = req.params;
    const result = await buyerCollection.findOne({ buyerId });
    res.json(result || null);
  } catch (err) {
    res.status(500).json({ message: "Server error fetching buyer profile" });
  }
});

// ২. প্রথমবার বায়ার প্রোফাইল তৈরি করা (POST)
app.post('/api/buyerProfile', async (req, res) => {
  try {
    const profile = req.body;
    const isExist = await buyerCollection.findOne({ buyerId: profile.buyerId });

    if (isExist) {
      return res.status(400).send({ message: "Buyer profile already exists" });
    }

    const result = await buyerCollection.insertOne(profile);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// ৩. বায়ার প্রোফাইল এবং পাসওয়ার্ড আপডেট করা (PATCH)
app.patch("/api/buyerProfile/:buyerId", async (req, res) => {
  try {
    const { buyerId } = req.params;
    const updatedData = req.body;

    // buyer id check............

    // পাসওয়ার্ড চেঞ্জের রিকোয়ারমেন্ট হ্যান্ডেলিং (যদি পাসওয়ার্ড ফিল্ড পাঠানো হয়)
    if (updatedData.password) {
      // 💡 নোট: প্রোডাকশনে পাসওয়ার্ড অবশ্যই bcrypt দিয়ে হ্যাশ করে সেভ করবেন। 
      // আপাতত আপনার রিকোয়ারমেন্টের অবজেক্ট স্ট্রাকচার অনুযায়ী সেট করা হলো।
      console.log(`Password changing requested for Buyer: ${buyerId}`);
    }

    const result = await buyerCollection.updateOne(
      { buyerId },
      { $set: updatedData }
    );

    res.send({
      success: true,
      message: "Buyer Profile configurations updated successfully",
      result
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});







// ------------order

// ১. বায়ার যখন কোনো প্রোডাক্ট অর্ডার করবে (অর্ডার তৈরি)
// 🎯 এতে বায়ারের সমস্ত প্রোফাইল ইনফরমেশন এমবেড হয়ে সেলারের জন্য রেডি থাকবে
app.post('/api/orders', async (req, res) => {
  try {
    const orderData = req.body;
    
    // ইনিশিয়াল অর্ডার স্ট্যাটাস সবসময় "Pending" থাকবে
    const finalOrder = {
      ...orderData,
      status: "Pending",
      createdAt: new Date()
    };

    const result = await orderCollection.insertOne(finalOrder);
    res.status(201).send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});





// ২. বায়ারের নিজস্ব 'My Orders' পেজের জন্য (Buyer ভিউ)
// ২. বায়ারের নিজস্ব 'My Orders' পেজের জন্য (Buyer ভিউ) - FIXED
app.get('/api/buyer/orders/:buyerId', async (req, res) => {
  try {
    const { buyerId } = req.params;
    
    // 🎯 ডাটাবেজের অবজেক্ট কি (Key) অনুযায়ী কুয়েরি ঠিক করা হলো
    const result = await orderCollection
      .find({ "buyerInfo.userId": buyerId }) 
      .sort({ createdAt: -1 })
      .toArray();
      
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});


// ৩. সেলারের ড্যাশবোর্ডের জন্য 'Manage Orders' (Seller ভিউ)
// 🎯 এই এপিআই-এর মাধ্যমে সেলার শুধু তার নিজের প্রোডাক্টের অর্ডার এবং বায়ারের সব ইনফো দেখতে পাবে
// app.get('/api/seller/orders/:sellerId', async (req, res) => {
//   try {
//     const { sellerId } = req.params;
//     const result = await orderCollection.find({ sellerId: sellerId }).sort({ createdAt: -1 }).toArray();
//     res.send(result);
//   } catch (error) {
//     res.status(500).send({ error: error.message });
//   }
// });

// app.get('/api/seller/orders/:sellerId', async (req, res) => {
//   try {
//     const { sellerId } = req.params;

//     const result = await orderCollection
//       .find({
//         "sellerInfo.userId": sellerId,
//       })
//       .sort({ createdAt: -1 })
//       .toArray();

//     res.send(result);
//   } catch (error) {
//     res.status(500).send({
//       error: error.message,
//     });
//   }
// });
app.get('/api/seller/orders/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;

    const orders = await orderCollection
      .find({
        "sellerInfo.userId": sellerId,
      })
      .sort({ createdAt: -1 })
      .toArray();

    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const buyerProfile = await buyerCollection.findOne({
          buyerId: order.buyerInfo?.userId,
        });

        return {
          ...order,
          buyerInfo: {
            ...order.buyerInfo,
            phone: buyerProfile?.phone || "",
            address: buyerProfile?.address || "",
            profilePicture: buyerProfile?.profilePicture || "",
          },
        };
      })
    );

    res.send(enrichedOrders);
  } catch (error) {
    res.status(500).send({
      error: error.message,
    });
  }
});



// ৪. সেলার অর্ডার আপডেট করবে (Accept / Reject / Update Delivery Status)
// ফ্লো কন্ট্রোল ট্র্যাকিং: Pending → Accepted → Delivered অথবা Rejected
// app.patch('/api/orders/:id/status', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status } = req.body; // ফ্রন্টএন্ড থেকে পাঠানো হবে: "Accepted", "Rejected", বা "Delivered"

//     // ভ্যালিডেশন চেক যেন ফ্লো ব্রেক না করে
//     const validStatuses = ["Pending", "Accepted", "Rejected", "Delivered"];
//     if (!validStatuses.includes(status)) {
//       return res.status(400).send({ message: "Invalid status state transition." });
//     }

//     const result = await orderCollection.updateOne(
//       { _id: new ObjectId(id) },
//       { $set: { status: status } }
//     );

//     res.send({
//       success: true,
//       message: `Order status successfully transitioned to ${status}`,
//       result
//     });
//   } catch (error) {
//     res.status(500).send({ error: error.message });
//   }
// });


app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

const validStatuses = [
  "processing",
  "Accepted",
  "Rejected",
  "Delivered"
];
    if (!validStatuses.includes(status)) {
      return res.status(400).send({
        message: "Invalid status",
      });
    }

    const result = await orderCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          orderStatus: status,
        },
      }
    );

    res.send({
      success: true,
      result,
    });
  } catch (error) {
    res.status(500).send({
      error: error.message,
    });
  }
});






app.get('/api/my/sellerProfile', verifyToken,verifySeller, async (req, res) => {
  try {
    const query = {};

    if (req.query.sellerId) {
      query.sellerId = req.query.sellerId;
    }

    const result = await sellerCollection.findOne(query);

    res.json(result || null); // 👈 IMPORTANT
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});



app.post('/api/sellerProfile', verifyToken,verifySeller, async (req, res) => {

  const profile = req.body;

  const isExist = await sellerCollection.findOne({
    sellerId: profile.sellerId
  });

  if (isExist) {
    return res.status(400).send({
      message: "Seller profile already exists"
    });
  }

  const result =
    await sellerCollection.insertOne(profile);

  res.send(result);
});







app.patch("/api/sellerProfile/:sellerId", verifyToken,verifySeller, async (req, res) => {
  try {
    const { sellerId } = req.params;

    const updatedData = req.body;

    await sellerCollection.updateOne(
      { sellerId },
      {
        $set: updatedData,
      }
    );

    await productCollection.updateMany(
      { sellerId },
      {
        $set: {
          sellerName: updatedData.name,
          sellerProfilePicture: updatedData.profilePicture,
        },
      }
    );

    res.send({
      success: true,
      message: "Profile updated",
    });
  } catch (error) {
    res.status(500).send({
      error: error.message,
    });
  }
});


// ........edit product

app.patch("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const updatedData = req.body;

    const result = await productCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
       $set: {
      ...updatedData,
      status: "pending",
    },
      }
    );

    res.send(result);
  } catch (error) {
    res.status(500).send({
      error: error.message,
    });
  }
});




// app.get("/api/products/:id", async (req, res) => {
//   const { id } = req.params;

//   const result = await productCollection.findOne({
//     _id: new ObjectId(id),
//   });

//   res.send(result);
// });


// delete product............

app.delete("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await productCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.send(result);
  } catch (error) {
    res.status(500).send({
      error: error.message,
    });
  }
});



// --------wishlist--------

// ১. চেক করা, প্রোডাক্টটি ইতিমধ্যে উইশলিস্টে আছে কিনা এবং বায়ারের সম্পূর্ণ উইশলিস্ট আইডি লিস্ট নেওয়া
app.get('/api/wishlist/check' , verifyToken , verifyBuyer ,async (req, res) => {
  try {
    const { userId, productId } = req.query;
    if (!userId) return res.status(400).send({ message: "UserId required" });

    if (productId) {
      // নির্দিষ্ট ১টা প্রোডাক্টের জন্য চেক (Product Details Page এর জন্য)
      const isExist = await wishlistCollection.findOne({ userId, productId });
      return res.send({ isWishlisted: !!isExist });
    } else {
      // বায়ারের উইশলিস্টে থাকা সকল প্রোডাক্ট আইডির অ্যারে (লিস্ট পেজে হার্ট কালার করার জন্য)
      const list = await wishlistCollection.find({ userId }).toArray();
      const productIds = list.map(item => item.productId);
      return res.send(productIds);
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// ২. উইশলিস্টে প্রোডাক্ট যোগ করা অথবা থাকলে রিমুভ করা (Toggle Feature)
app.post('/api/wishlist/toggle', verifyToken , verifyBuyer , async (req, res) => {
  try {
    const { userId, productId } = req.body;
    if (!userId || !productId) return res.status(400).send({ message: "Missing data" });

    const isExist = await wishlistCollection.findOne({ userId, productId });

    if (isExist) {
      // যদি আগে থেকেই থাকে, তাহলে রিমুভ করে দাও
      await wishlistCollection.deleteOne({ userId, productId });
      return res.send({ isWishlisted: false, message: "Removed from wishlist" });
    } else {
      // না থাকলে নতুন করে অ্যাড করো
      await wishlistCollection.insertOne({ userId, productId, addedAt: new Date() });
      return res.send({ isWishlisted: true, message: "Added to wishlist" });
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// ৩. বায়ারের ড্যাশবোর্ডে উইশলিস্ট করা প্রোডাক্টগুলোর ডিটেইলস ডাটা রিট্রিভ করা (Aggregate)
app.get('/api/wishlist/:userId', verifyToken ,  verifyBuyer , async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await wishlistCollection.aggregate([
      { $match: { userId: userId } },
      {
        $addFields: {
          // productId কে স্ট্রিং থেকে ObjectI-এ কনভার্ট করা যেন Lookup ম্যাচ করে
          productObjId: { $toObjectId: "$productId" }
        }
      },
      {
        $lookup: {
          from: "products", // প্রোডাক্ট কালেকশনের নাম
          localField: "productObjId",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" }, // অ্যারে থেকে অবজেক্টে রূপান্তর
      {
        $project: {
          _id: 1,
          productId: 1,
          userId: 1,
          ProductTitle: "$productDetails.ProductTitle",
          Price: "$productDetails.Price",
          Stock: "$productDetails.Stock",
          ImageUrl: "$productDetails.ImageUrl",
          Category: "$productDetails.Category"
        }
      }
    ]).toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});









// --------payment-------
app.get('/api/payments/:buyerId', async (req, res) => {

  const { buyerId } = req.params;

  const result =
    await paymentCollection
      .find({ buyerId })
      .toArray();

  res.send(result);

});



app.post('/api/payments', async (req, res) => {
  try {
    const paymentData = req.body;

    // ১. পেমেন্ট অলরেডি সেভড কিনা চেক করা
    const isExist = await paymentCollection.findOne({
      stripeSessionId: paymentData.stripeSessionId
    });

    if (isExist) {
      return res.send({ message: "Already Saved" });
    }

    // ২. পেমেন্ট কালেকশনে ট্রানজেকশন সেভ করা
    const paymentResult = await paymentCollection.insertOne(paymentData);

    // 🆕 ৩. ডাটাবেজ থেকে বায়ারের রিয়েল প্রোফাইল খুঁজে বের করা (null ঠেকাতে)
    const buyerProfile = await buyerCollection.findOne({ buyerId: paymentData.buyerId });

    // 🆕 ৪. ডাটাবেজ থেকে প্রোডাক্টের মেইন ডাটা তুলে আনা (যাতে সেলারের আইডি এবং ডিটেইলস পাওয়া যায়)
    const productDetail = await productCollection.findOne({ _id: new ObjectId(paymentData.productId) });

    // ৫. 🎯 ডকের রিকোয়ারমেন্ট অনুযায়ী নিখুঁত অবজেক্ট স্ট্রাকচার তৈরি
    const orderDoc = {
buyerInfo: {
    userId: paymentData.buyerId,
    name: paymentData.buyerName,
    phone: paymentData.buyerPhone,
    address: paymentData.buyerAddress,

    email: buyerProfile?.email || "",
    profilePicture: buyerProfile?.profilePicture || "",
},
      sellerInfo: {
        userId: productDetail ? productDetail.sellerId : null,    // প্রোডাক্ট ডক থেকে সেলার আইডি
        name: productDetail ? productDetail.sellerName : null,    // প্রোডাক্ট ডক থেকে সেলারের নাম
        email: productDetail ? productDetail.sellerEmail : null   // প্রোডাক্ট ডক থেকে সেলারের ইমেইল
      },
      productId: paymentData.productId,
      productTitle: paymentData.productTitle || (productDetail ? productDetail.ProductTitle : "Premium Product"), // ফ্রন্টএন্ডের জন্য টাইটেল ব্যাকআপ
      price: paymentData.amount || (productDetail ? productDetail.Price : 0), // ফ্রন্টএন্ডের জন্য প্রাইস ব্যাকআপ
      paymentStatus: "paid",
      orderStatus: "processing", 
      createdAt: new Date()
    };

    // orders কালেকশনে নিখুঁত ডাটা ঢুকিয়ে দেওয়া
    await orderCollection.insertOne(orderDoc);

    // ৬. প্রোডাক্টের স্টক ১ কমিয়ে দেওয়া
    await productCollection.updateOne(
      { _id: new ObjectId(paymentData.productId), Stock: { $gt: 0 } },
      { $inc: { Stock: -1 } }
    );

    res.send({
      success: true,
      message: "Payment tracked and Order collected in strict format without null values",
      paymentResult
    });

  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});





    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
//     console.log("Pinged your deployment. You successfully connected to MongoDB!");
//   } finally {
//     // Ensures that the client will close when you finish/error
//     // await client.close();
//   }
// }
// run().catch(console.dir);

app.listen(port, () => {
    console.log(`Example app listning on port ${port}`)
});

module.exports = app;