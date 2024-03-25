const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  profilePicture: {
    data: Buffer,
    contentType: String,
  },
});

const loginSchema = new mongoose.Schema({
  email: String,
  password: String,
});
const chatSchema = new mongoose.Schema({
  message: String,
  sender: String,
  recipient: String,
  time: String,
});
module.exports = {
  User: mongoose.model("User", userSchema),
  Chat: mongoose.model("Chat", chatSchema),
};
