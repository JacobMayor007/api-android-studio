require('dotenv').config(); 
const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

if (!process.env.MONGODB_URI) {
  console.error("ERROR: MONGODB_URI environment variable is not defined");
  process.exit(1);
}

const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: ServerApiVersion.v1,
  tls: true,
  minPoolSize: 10,
  maxPoolSize: 100,
  retryWrites: true,
  retryReads: true,
  directConnection: false,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 30000,
  waitQueueTimeoutMS: 30000,
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");

    const database = client.db("JBox");
    const collection = database.collection("users");

    app.post("/api/users", async (req, res) => {
      try {
        const { email, password } = req.body;
        
        if (!email || !password) {
          return res.status(400).json({
            success: false,
            message: "Email and password are required"
          });
        }
    
        const existingUser = await collection.findOne({ email });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: "Email already registered"
          });
        }
            
        const newUser = {
          email,
          password,
          createdAt: new Date()
        };
        
        const result = await collection.insertOne(newUser);
        
        res.status(201).json({
          success: true,
          message: "User created successfully",
          userId: result.insertedId
        });
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
          success: false,
          message: "Server error"
        });
      }
    });

    app.get("/api/users/login", async(req, res)=>{
      res.send("Login")
    })

    app.post("/api/users/login", async (req, res) => {
      try {
        const { email, password } = req.body;
        
        const user = await collection.findOne({ email });
        
        if (!user) {
          return res.status(401).json({
            success: false,
            message: "Invalid credentials"
          });
        }

        const passwordMatch = await (password, user.password);
        if (!passwordMatch) {
          return res.status(401).json({
            success: false,
            message: "Invalid credentials"
          });
        }

        res.json({
          success: true,
          message: "Login successful",
          userId: user._id
        });
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
          success: false,
          message: "Server error"
        });
      }
    });

    app.get("/", (req, res) => {
      res.send("Server is running. POST to /api/users to insert data.");
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server is listening on port ${PORT}`);
    });

  } catch (err) {
    console.error("Database connection error:", err);
    process.exit(1);
  }
}

run().catch(console.dir);