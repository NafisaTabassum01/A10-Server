const express = require('express')
const cors = require('cors');
const app = express()
const port = 5000
require('dotenv').config()

app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');


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

app.post('/api/sellerProfile', async (req, res) => {
  try {
    const profile = req.body;
    const result = await sellerCollection.insertOne(profile);

    res.json({
      success: true,
      insertedId: result.insertedId,
    });
  } catch (err) {
    res.status(500).json({ message: "Insert failed" });
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

    const result =
      await paymentCollection.insertOne(paymentData);

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