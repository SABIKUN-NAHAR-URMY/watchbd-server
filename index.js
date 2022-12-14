const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SK);
const port = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ho0d8c2.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        const watchesCategoryCollection = client.db('productCategory').collection('categories');
        const watchesProductsCollection = client.db('productCategory').collection('products');
        const usersCollection = client.db('productCategory').collection('users');
        const bookingsCollection = client.db('productCategory').collection('bookings');
        const paymentsCollection = client.db('productCategory').collection('payments');
        const advertiseCollection = client.db('productCategory').collection('advertise');
        const reportedCollection = client.db('productCategory').collection('reported');

        app.get('/category', async (req, res) => {
            const query = {};
            const result = await watchesCategoryCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/products/:categoryID', async (req, res) => {
            const id = req.params.categoryID;
            const query = { category_id: parseInt(id) };
            const result = await watchesProductsCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/myProducts/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const result = await watchesProductsCollection.find(query).toArray();
            res.send(result);
        })

        app.delete('/myProducts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await watchesProductsCollection.deleteOne(query);
            const resultData = await advertiseCollection.deleteOne({productId : id});
            res.send(resultData);
        })

        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await watchesProductsCollection.insertOne(product);
            res.send(result);
        });

        app.get('/users', async(req, res)=>{
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        })

        app.get('/users/allSellers', async (req, res) => {
            const query = { value: 'Seller' };
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        })

        app.delete('/users/allSellers/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })

        app.get('/users/allBuyers', async (req, res) => {
            const query = { value: 'Buyer' };
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        })

        app.delete('/users/allBuyers/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.value === 'Admin' });
        })
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.value === 'Seller' });
        })

        app.get('/users/sellerVerify/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({isVerified: user?.status});
        })

        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isBuyer: user?.value === 'Buyer' });
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = {
                email: user.email,
                value: user.value    
            }
            const alreadySignup = await usersCollection.find(query).toArray();
            if (alreadySignup.length) {
                return res.send({ acknowledged: false });
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        app.put('/users/:id', async(req, res)=>{
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const user = req.body;
            const option = {upsert : true};
            const updateDoc ={
                $set: {
                    status: 'Verified '
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc, option);
            res.send(result);
        })

        app.get('/myOrders/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const result = await bookingsCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const booking = await bookingsCollection.findOne(query);
            res.send(booking);
        })

        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = parseFloat(booking.price);
            const amount = parseInt(price * 100);

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);

            const id = payment.bookingId;
            const filter = { _id: ObjectId(id) };
            const query = { bookingId: id };
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updateResult = await bookingsCollection.updateOne(query, updateDoc);
            const updateProduct = await watchesProductsCollection.updateOne(filter, updateDoc);
            const updateAdvertise = await advertiseCollection.findOneAndDelete({productId: id});
            res.send(result);
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const query = {
                email: booking.email,
                itemName: booking.itemName
            }
            const alreadyBooked = await bookingsCollection.find(query).toArray();
            if (alreadyBooked.length) {
                return res.send({ acknowledged: false });
            }
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });

        app.get('/advertise', async (req, res) => {
            const query = {};
            const result = await advertiseCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/advertise', async (req, res) => {
            const advertise = req.body;
            const query = {
                email: advertise.email,
                productName: advertise.productName
            }
            const alreadyAdvertise = await advertiseCollection.find(query).toArray();
            if (alreadyAdvertise.length) {
                return res.send({ acknowledged: false });
            }
            const result = await advertiseCollection.insertOne(advertise);
            res.send(result);
        });

        app.get('/reported', async (req, res) => {
            const query = {};
            const result = await reportedCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/reported', async(req, res)=>{
            const reported = req.body;
            const query = {
                email: reported.email,
                productName: reported.productName
            }
            const alreadyReported = await reportedCollection.find(query).toArray();
            if (alreadyReported.length) {
                return res.send({ acknowledged: false });
            }
            const result = await reportedCollection.insertOne(reported);
            res.send(result);
        })

        app.delete('/reported/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await watchesProductsCollection.deleteOne(query);
            const resultData = await reportedCollection.deleteOne({_id: id });
            res.send(resultData);
        })

    }
    finally {

    }
}
run().catch(error => console.error(error));

app.get('/', (req, res) => {
    res.send('WatchBD server is running')
})

app.listen(port, () => {
    console.log(`WatchBD listening on port ${port}`)
});