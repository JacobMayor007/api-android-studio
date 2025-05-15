require('dotenv').config(); 
const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
const { json } = require('stream/consumers');
const { ObjectId } = require('mongodb');
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
    const ticketCollection = database.collection("tickets")

    app.post("/api/users", async (req, res) => {
      try {
        const { email, password } = req.body;
        
        if (!email || !password) {
          return res.status(400).json({
            success: false,
            message: "Email and password are required"
          });
        }

        if(!email.includes("@")){
          res.status(400).json({
            success: false,
            message: "Email is not valid."
          })
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

        const passwordMatch = password === user.password; 
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

    app.put("/api/users/:userId", async (req, res) => {
      try {
        const { userId } = req.params;
        const { password } = req.body;

        if (!password) {
          return res.status(400).json({
            success: false,
            message: "Password is required",
          });
        }

        const user = await collection.findOne({
          _id: new ObjectId(userId)
        });

        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        if (user.password === password) {
          return res.status(400).json({
            success: false,
            message: "New password cannot be the same as current password",
          });
        }

        const result = await collection.findOneAndUpdate(
          { _id: new ObjectId(userId) },
          { $set: { password: password } },
          { returnDocument: "after" }
        );

        if (!result) {
          return res.status(500).json({
            success: false,
            message: "Failed to update password",
          });
        }

        return res.status(200).json({
          success: true,
          message: "Password updated successfully",
          userId: result._id
        });

      } catch (error) {
        console.error("Error:", error);
        
        if (error instanceof TypeError || error.message.includes("ObjectId")) {
          return res.status(400).json({
            success: false,
            message: "Invalid user ID format",
          });
        }
        
        return res.status(500).json({
          success: false,
          message: "Server error"
        });
      }
    });

    app.delete("/api/users/:userId", async (req, res) => {
      try {
        const {userId} = req.params
       
        const result = 
        collection.deleteOne({_id: new ObjectId(userId)})
        
        if(!result){
          res.status(400).json({
            success: false,
            message: "Deleting account unsuccessful"
          })
        }

        return res.status(200).json({
          success: true,
          message: "Deleting account is successful",
        })

      } catch (error) {
          console.error(error);
          res.status(500).json({
              success: false,
              message: "Server error"
          });
        }
    })

    app.post("/api/users/book-ticket", async (req, res)=>{
      try {
        const {userId, movieName, day, time, email, total, location, quantity, popcornSize, seatNumber, imageURL} = req.body
        
        if (!userId || !movieName || !day || !time || !email || !total || !location || !quantity
           || !seatNumber
        ) {
          return res.status(400).json({
            success: false,
            message: "Please input all required fields"
          });
        }
        
        const newTicket = {
          userId: userId, 
          movieName: movieName,
          day: day, 
          time: time, 
          email: email,
          total: total, 
          location: location, 
          quantity: quantity, 
          popcornSize: popcornSize, 
          seatNumber: seatNumber,
          imageURL: imageURL,
        }

        const result = await ticketCollection.insertOne(newTicket)

         res.json({
          success: true,
          message: "Book Ticket successful",
          ticketid: result._id,
          userId: userId,
        });

      } catch (error) {
        console.error("Error: ",error);
        res.status(500),json({
          success:false,
          message: "Server Error"
        })
      }
    })

    app.get("/", (req, res) => {
      res.send("Server is running. POST to /api/users to insert data.");
    });

   app.get("/api/users/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const tickets = await ticketCollection.find({ userId }).toArray();

        if (!tickets || tickets.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No tickets found for this user"
            });
        }

        // Convert MongoDB documents to match your Android model
        const formattedTickets = tickets.map(ticket => ({
            id: ticket._id.toString(),  // Convert ObjectId to string and rename to 'id'
            userId: ticket.userId,
            movieName: ticket.movieName,
            day: ticket.day,
            time: ticket.time,
            email: ticket.email,
            total: ticket.total,
            location: ticket.location,
            quantity: ticket.quantity,
            popcornSize: ticket.popcornSize,
            seatNumber: ticket.seatNumber,
            imageURL: ticket.imageURL
        }));

        res.status(200).json({
            success: true,
            data: formattedTickets,  // Send the formatted tickets
            message: "Tickets retrieved successfully"
            });
        } catch (error) {
            console.error("Error fetching tickets:", error);
            res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
      });

      app.put("/api/tickets/:ticketId", async (req, res) => {
          try {
              const { ticketId } = req.params;
              const updateData = req.body;

              const existingTicket = await ticketCollection.findOne({
                  _id: new ObjectId(ticketId)
              });

              if (!existingTicket) {
                  return res.status(404).json({
                      success: false,
                      message: "Ticket not found"
                  });
              }

              const result = await ticketCollection.findOneAndUpdate(
                  { 
                      _id: new ObjectId(ticketId),
                  },
                  { $set: updateData },
                  { returnDocument: 'after' }
              );

              res.status(200).json({
                  success: true,
                  data: result,
                  message: "Ticket updated successfully"
              });

          } catch (error) {
              console.error("Update error:", error);
              res.status(500).json({
                  success: false,
                  message: "Internal server error",
                  error: error.message
              });
          }
      });

      app.delete("/api/tickets/:ticketId", async (req, res) => {
          const { ticketId } = req.params;

          // Validate ID
          if (!ObjectId.isValid(ticketId)) {
              return res.status(400).json({
                  success: false,
                  message: "Invalid ticket ID format"
              });
          }

          try {
              const result = await ticketCollection.deleteOne({ _id: new ObjectId(ticketId) });

              if (result.deletedCount === 0) {
                  return res.status(404).json({
                      success: false,
                      message: "Ticket not found"
                  });
              }

              res.status(200).json({
                  success: true,
                  message: "Ticket deleted successfully",
                  data: result
              });

          } catch (error) {
              console.error(error);
              res.status(500).json({
                  success: false,
                  message: "Server error"
              });
          }
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