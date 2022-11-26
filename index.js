const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
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

        app.post('/users', async(req, res)=>{
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
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