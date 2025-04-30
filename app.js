const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors"); // Add this line
const app = express();

app.use(cors());
app.use(express.json());

const url = "mongodb+srv://JBox:%40JB0x%21%40%23@cluster0.zley7zt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(url, {
  serverApi: ServerApiVersion.v1
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");

    const database = client.db("JBox");
    const collection = database.collection("users");

    // POST endpoint to accept data from Android
    app.post("/api/users", async (req, res) => {
        try {
          // Properly destructure email and password from request body
          const { email, password } = req.body;
          
          // Check if required fields exist
          if (!email || !password) {
            return res.status(400).json({
              success: false,
              message: "Email and password are required"
            });
          }
      
          // Check if user already exists
          const existingUser = await collection.findOne({ email });
          if (existingUser) {
            return res.status(400).json({
              success: false,
              message: "Email already registered"
            });
          }
      
          // Create new user (in production, hash the password!)
          const newUser = {
            email,
            password, // IMPORTANT: Hash this in production!
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

    // GET endpoint for testing
    app.get("/", (req, res) => {
      res.send("Server is running. POST to /api/users to insert data.");
    });

    app.listen(3000, () => {
      console.log("Server is listening on port 3000");
    });

  } catch (err) {
    console.error("Database connection error:", err);
  }
}

run().catch(console.dir);