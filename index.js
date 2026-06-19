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


app.post('/api/sellerProfile', async (req, res) => {
  try {
    const profile = req.body;

    const existing = await sellerCollection.findOne({
      email: profile.email
    });

    // already exists
    if (existing) {
      return res.status(409).send({
        success: false,
        message: "Profile already exists"
      });
    }

    // insert FIRST
    const result = await sellerCollection.insertOne(profile);

    // then send response
    return res.status(201).send({
      success: true,
      insertedId: result.insertedId
    });

  } catch (error) {
    console.error("Seller Profile Error:", error);
    return res.status(500).send({
      success: false,
      message: "Database server error"
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