const express = require("express");
const app = express();
// const cors = require("cors");
const connectToDb = require("../db");
const User = require("../model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
connectToDb();

// app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.post("/user", async (req, res) => {
  try {
    console.log(req.body);
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) res.status(401).send("User already exist");

    const encryptedPass = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: encryptedPass });

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
    res.status(201).json(user);
    await user.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error creating User" });
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
app.post("/search", async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findOne({ name });
    if (!user) res.status(500).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    console.log(error);
  }
});

app.use("/", (req, res) => {
  res.json({ message: "Server Started and database connected" });
});
let port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
