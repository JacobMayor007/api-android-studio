const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

// 1. Define your MongoDB connection URI properly
const uri = process.env.MONGODB_URI;

// 2. Create MongoClient with proper options
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  tls: true
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");

    const database = client.db("JBox");
    const collection = database.collection("users");

    // POST endpoint for registration
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
          password, // Remember to hash this in production!
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

    // POST endpoint for login
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

        // In production, use bcrypt.compare() here!
        if (user.password !== password) {
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

    // Start server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server is listening on port ${PORT}`);
    });

  } catch (err) {
    console.error("Database connection error:", err);
    process.exit(1); // Exit if DB connection fails
  }
}

run().catch(console.dir);