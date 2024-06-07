const mongoose = require("mongoose");

async function connectToDb() {
  await mongoose.connect(
    "mongodb+srv://iqlipse22:Uprvmz9ikr@cluster0.xkqjppx.mongodb.net/?retryWrites=true&w=majority"
  ),
    // await mongoose.connect("mongodb://localhost:27017/user");

    console.log("Database connected");
}

module.exports = connectToDb;
