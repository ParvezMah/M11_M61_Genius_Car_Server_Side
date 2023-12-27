const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
var jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
  // origin: "*",  // For all origin
  origin: [
      'http://127.0.0.1:5173',
      'https://practise-1cdf9.web.app/',
      'https://practise-1cdf9.firebaseapp.com/'
    ],
  // methods:['GET','PUT'],
  credentials : true
}));
app.use(express.json()); // so that we can convert into json data sent to req.body;
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4hz08yb.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// // Our Own middlewares
const logger = async(req, res, next) =>{
  // console.log('Called : ', req.hostname, req.originalUrl);
  console.log('log: Info', req.method, req.url);
  next();
}
const verifyToken = async(req, res, next) => {
  const token = req?.cookies?.token;
  // console.log('token in the middleware : ', token)
  // no token available
  if(!token){
    return res.status(401).send({message: 'unauthorized access'})
  }

  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err, decoded)=>{
    if(err){
      res.status(401).send({message:'Again unauthorized access'})
    }
    req.user = decoded;
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db('GeniusCar').collection('services');
    const bookingCollection = client.db('GeniusCar').collection('bookings');


    // // Auth Related API Previous
    // app.post('/jwt', async(req,res)=>{
    //   const user = req.body;
    //   console.log(user);
    //   // tokenName = jwt.sign(payload, secred, {expiresIn:'1h'})
    //   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
    //   res
    //   .cookie('token', token, {
    //     httpOnly: true,
    //     secure: false,
    //     // maxAge:200000,
    //     // secure: process.env.NODE_ENV === 'production', 
    //     sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    // })
    //   .send({success: true});
    // })


    // Auth Related API
    app.post('/jwt',logger, async(req, res)=>{
      const user = req.body;
      console.log('User for token : ', user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
      res.cookie('token', token,{
        httpOnly:true,
        secure: true,
        sameSite:'none'
      })
    .send({success:true});
    })

    app.post('/logout', async(req, res)=>{
      const user = req.body;
      console.log('Logging out : ', user);
      res.clearCookie('token', {maxAge: 0}).send({success:true});
    })


    // Services Related API
    app.get('/services', async(req, res)=>{
        const cursor = serviceCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

    app.get('/services/:id',async(req, res)=>{
        const id = req.params.id;
        const query = {_id : new ObjectId(id)}

        const options = {
            // Include only the `title` and `price`, service_id fields in the returned document
            projection: { title: 1, price: 1, service_id: 1, img: 1 },
          };

        const result = await serviceCollection.findOne(query, options);
        res.send(result);
    })

    // Getting bookings Data
    app.get('/bookings',logger, verifyToken, async(req, res)=>{
        console.log(req.query.email);
        console.log('token owner info', req.user);
        if(req.user.email !== req.query.email){
          return res.status(403).send({message: 'forbidden access'})
        }
        // console.log('tok tok token : ', req.cookies.token);
        // console.log('user in the valid token', req.user);
        // if(req.query.email !== req.user.email){
        //   return res.status(403).send({message:'forbidden access'})
        // }
        let query = {}
        if(req.query?.email){
            query = {email: req.query.email}
        }
        const result = await bookingCollection.find(query).toArray();
        res.send(result)
    })

    // creating/posting on bookings
    app.post('/bookings', async(req, res)=>{
        const booking = req.body;
        console.log(booking);
        const result = await bookingCollection.insertOne(booking);
        res.send(result)
    })

    // Delete specific bookings item
    app.delete('/bookings/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    })


    app.patch('/bookings/:id', async(req, res)=>{
      const id = req.params.id;
      // filter or query are same
      const filter = {_id: new ObjectId(id)};
      const updatedBookings = req.body;
      console.log(updatedBookings); 
      // Specify the update to set a value for the plot field
      const updateDoc = {
        $set: {
          status: updatedBookings.status
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res)=>{
    res.send('Genius Car is running........')
})

app.listen(port, ()=>{
    console.log(`Genius Car is running on ${port}`);
})

