const express = require("express");
const cors = require("cors");
const connectToDb = require("../db");
const { User, Chat } = require("../model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer"); // Allow image to be uploaded to the database
const http = require("http"); // Use http module for creating the server
const socketIo = require("socket.io");

const app = express();
app.use(cors());
const { createServer } = require("node:http");
const { join } = require("node:path");
const server = http.createServer(app); // Create an http server with express app
const io = socketIo(server);

connectToDb();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post("/user", upload.single("profilePicture"), async (req, res) => {
  try {
    console.log(req.body);
    console.log(req.file);
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(401).json({ message: "User already exists" });
    const existingName = await User.findOne({ name });
    if (existingName)
      return res.status(401).json({ message: "UserName already exists" });

    const encryptedPass = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: encryptedPass,
      profilePicture: {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      },
    });
    await user.save();
    const token = jwt.sign(
      { id: user._id, email },
      "shhhh", //process.env.jwtsecret
      {
        expiresIn: "2h",
      }
    );
    user.token = token;
    user.password = undefined; //making password not send to db

    //cookie section
    const options = {
      expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      httpOnly: true,
    };
    res.status(200).cookie("token", token, options).json({
      success: true,
      token,
      user,
    });
  } catch (err) {
    res.status(500).json({ message: "Error creating User" });
  }
});

app.put("/user/:_id", upload.single("profilePicture"), async (req, res) => {
  try {
    const { _id } = req.params;
    const { name, email, password } = req.body;

    let updatedData = { name, email, password };

    if (req.file) {
      updatedData.profilePicture = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }
    const encryptedPass = password
      ? await bcrypt.hash(password, 10)
      : undefined;
    if (encryptedPass) {
      updatedData.password = encryptedPass;
    }
    console.log(updatedData);
    const updatedUser = await User.findByIdAndUpdate(_id, updatedData, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res
      .status(200)
      .json({ message: "User updated successfully", user: updatedUser });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ message: "Error updating user" });
  }
});

app.delete("/user/:_id", async (req, res) => {
  try {
    const { _id } = req.params;
    const deletedUser = await User.findByIdAndDelete(_id);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ message: "Error deleting user" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) res.status(500).json({ message: "USER NOT EXIST" });
    //match the password
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign(
        { id: user._id },
        "shhhh", //process.env.jwtsecret
        {
          expiresIn: "2h",
        }
      );
      user.token = token;
      user.password = undefined; //making password not send to db

      //send token in cookie
      //cookie section
      const options = {
        expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        httpOnly: true,
      };
      res.status(200).cookie("token", token, options).json({
        success: true,
        token,
        user,
      });
    }
  } catch (error) {
    console.log(error);
  }
});

app.get("/search", async (req, res) => {
  try {
    const items = await User.find();
    res.json(items);
  } catch (error) {
    console.log(error);
  }
});

app.get("/chats", async (req, res) => {
  try {
    const items = await Chat.find();
    res.json(items);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error retrieving chat" });
  }
});
app.get("/user/:name", async (req, res) => {
  try {
    const { name } = req.params;
    console.log(name);
    const items = await User.findOne({ name });
    res.json(items);
  } catch (error) {
    console.log(error);
  }
});

io.on("connection", (socket) => {
  console.log("A user connected");
  socket.on("chat message", async (msg) => {
    try {
      console.log("Message received from frontend:", msg);
      const { sender, recipient, message, time } = msg;
      const chat = new Chat({
        message: msg.message,
        sender: msg.sender,
        recipient: msg.recipient,
        time: msg.time,
      });
      await chat.save();
      io.emit("chat message", msg);
    } catch (error) {
      console.error("Error saving chat message:", error);
    }
  });

  io.on("connection", (socket) => {
    console.log("Fetching started");
    socket.on("fetch messages", async ({ sender, recipient }) => {
      console.log("Fetching messages for:", sender, recipient);
      try {
        const messages = await Chat.find({
          $or: [
            { sender: sender, recipient: recipient },
            { sender: recipient, recipient: sender },
          ],
        }).sort({ createdAt: 1 });

        socket.emit("messages fetched", messages);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

app.use("/", (req, res) => {
  res.json({ message: "Server Started and database connected" });
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
