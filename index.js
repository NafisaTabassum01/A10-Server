const express = require('express')
const cors = require('cors');
const app = express()
const port = 5000
require('dotenv').config()

app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


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

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

// --------collection-------------
const database = client.db("Assignment_10_db");
const productCollection = database.collection("products");
const sellerCollection = database.collection("sellerProfiles");
const paymentCollection = database.collection("payments");
const wishlistCollection = database.collection("wishlist");




app.get('/api/products' , async (req,res) =>{
    const  query = {};
    if (req.query.sellerId){
        query.sellerId = req.query.sellerId;

    }
    if(req.query.status){
        query.status = req.query.status;
    }
    const cursor = productCollection.find(query);
    const result = await cursor.toArray();
    res.send(result);
} )


app.post('/api/products' , async (req,res) =>{
    const product = req.body;
    const result = await productCollection.insertOne(product)
    res.send(result)
} )


// app.get('/api/my/sellerProfile' , async (req,res)=>{
  
//   const query ={};
//   if(req.query.sellerId){
//     query.sellerId= req.query.sellerId;

//   }
//   const result = await sellerCollection.findOne(query);
//   res.send(result);

// })
// reduce stock----------
// const { ObjectId } = require("mongodb");

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







app.get('/api/my/sellerProfile', async (req, res) => {
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


// app.post('/api/sellerProfile', async (req, res) => {
//   const profile = req.body;
//   const result = await sellerCollection.insertOne(profile)
//   res.send(result);
//   });

// app.post('/api/sellerProfile', async (req, res) => {
//   try {
//     const profile = req.body;
//     const result = await sellerCollection.insertOne(profile);

//     res.json({
//       success: true,
//       insertedId: result.insertedId,
//     });
//   } catch (err) {
//     res.status(500).json({ message: "Insert failed" });
//   }
// });

app.post('/api/sellerProfile', async (req, res) => {

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






// edit seller.............
// app.patch("/api/sellerProfile/:sellerId", async (req, res) => {
//   try {
//     const { sellerId } = req.params;

//     const updatedData = req.body;

//     const result = await sellerCollection.updateOne(
//       {
//         sellerId,
//       },
//       {
//         $set: updatedData,
//       }
//     );

//     res.send(result);
//   } catch (error) {
//     res.status(500).send({
//       error: error.message,
//     });
//   }
// });

app.patch("/api/sellerProfile/:sellerId", async (req, res) => {
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
        $set: updatedData,
      }
    );

    res.send(result);
  } catch (error) {
    res.status(500).send({
      error: error.message,
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
app.get('/api/wishlist/check', async (req, res) => {
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
app.post('/api/wishlist/toggle', async (req, res) => {
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
app.get('/api/wishlist/:userId', async (req, res) => {
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

    const isExist = await paymentCollection.findOne({
      stripeSessionId: paymentData.stripeSessionId
    });

    if (isExist) {
      return res.send({
        message: "Already Saved"
      });
    }

    // const result =
    //   await paymentCollection.insertOne(paymentData);

    // res.send(result);

const result = await paymentCollection.insertOne(paymentData);

await productCollection.updateOne(
  {
    _id: new ObjectId(paymentData.productId),
    Stock: { $gt: 0 }
  },
  {
    $inc: {
      Stock: -1
    }
  }
);

res.send(result);


  } catch (error) {

    res.status(500).send({
      error: error.message
    });

  }
});


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port,()=>{
    console.log(`Example app listning on port ${port}`)
})