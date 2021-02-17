require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("express-jwt");
const jwtDecode = require("jwt-decode");
const mongoose = require("mongoose");
const path = require("path");
const dashboardData = require("./data/dashboard");
const User = require("./data/User");
const InventoryItem = require("./data/InventoryItem");

// const transporter = nodemailer.createTransport(
//   sendgridTransport({
//     aut: {
//       api_key: "",
//     },
//   })
// );
const { createToken, hashPassword, verifyPassword } = require("./util");

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post("/api/authenticate", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Enabling the lean option tells Mongoose to skip instantiating a full
    // Mongoose document and just give you the POJO
    const user = await User.findOne({ email }).lean();

    if (!user) {
      return res.status(403).json({
        message: "Wrong email or password.",
      });
    }

    const passwordValid = await verifyPassword(password, user.password);

    if (passwordValid) {
      const { password, bio, ...rest } = user;
      const userInfo = Object.assign({}, { ...rest });

      const token = createToken(userInfo);

      const decodedToken = jwtDecode(token);
      const expiresAt = decodedToken.exp;

      res.json({
        message: "Authentication successful!",
        token,
        userInfo,
        expiresAt,
      });
    } else {
      res.status(403).json({
        message: "Wrong email or password.",
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(400).json({ message: "Something went wrong." });
  }
});

app.post("/api/signup", async (req, res) => {
  try {
    const { email, firstName, lastName } = req.body;

    const hashedPassword = await hashPassword(req.body.password);
    var dateB = new Date(); // Now
    dateB.setDate(dateB.getDate() + 30); // Set now + 30 days as the new date
    const temp = dateB.toGMTString(); // Set now + 30 days as the new date

    const userData = {
      email: email.toLowerCase(),
      firstName,
      lastName,
      password: hashedPassword,
      role: "admin",
      passwordExpr: dateB,
    };

    const existingEmail = await User.findOne({
      email: userData.email,
    }).lean();

    if (existingEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const newUser = new User(userData);
    const savedUser = await newUser.save();

    if (savedUser) {
      const token = createToken(savedUser);
      const decodedToken = jwtDecode(token);
      const expiresAt = decodedToken.exp;

      const { firstName, lastName, email, role, passwordExpr } = savedUser;

      const userInfo = {
        firstName,
        lastName,
        email,
        role,
        passwordExpr,
      };
      // transporter.sendMail({
      //   to: email,
      //   from: "prelim-exam.com",
      //   subject: "Sign Up Succeeded",
      //   html:
      //     "<h1> You successfully signed up! </h1><p>Please remember you have to refresh your password after 30 days</p>",
      // });
      return res.json({
        message: "User created!",
        token,
        userInfo,
        expiresAt,
      });
    } else {
      return res.status(400).json({
        message: "There was a problem creating your account",
      });
    }
  } catch (err) {
    return res.status(400).json({
      message: "There was a problem creating your account",
    });
  }
});

const attachUser = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ message: "Authentication invalid :)" });
  }
  const decodedToken = jwtDecode(token.slice(7));

  if (!decodedToken) {
    return res.status(401).json({
      message: "There was a problem authorizing the request",
    });
  } else {
    req.user = decodedToken;
    next();
  }
};

app.use(attachUser);

const requireAuth = jwt({
  secret: process.env.JWT_SECRET,
  audience: "api.orbit",
  issuer: "api.orbit",
});

const requireAdmin = (req, res, next) => {
  const { role } = req.user;
  if (role !== "admin") {
    return res.status(401).json({ message: "Insufficient role" });
  }
  next();
};

app.get("/api/dashboard-data", requireAuth, (req, res) =>
  res.json(dashboardData)
);

app.patch("/api/user-role", async (req, res) => {
  try {
    const { role } = req.body;
    const allowedRoles = ["user", "admin"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Role not allowed" });
    }
    await User.findOneAndUpdate({ _id: req.user.sub }, { role });
    res.json({
      message:
        "User role updated. You must log in again for the changes to take effect.",
    });
  } catch (err) {
    return res.status(400).json({ error: err });
  }
});

app.get("/api/inventory", requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = req.user.sub;
    const inventoryItems = await InventoryItem.find({ user });
    res.json(inventoryItems);
  } catch (err) {
    return res.status(400).json({ error: err });
  }
});

app.post("/api/inventory", requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = req.user.sub;
    const input = Object.assign({}, req.body, {
      user: userId,
    });
    const inventoryItem = new InventoryItem(input);
    await inventoryItem.save();
    res.status(201).json({
      message: "Inventory item created!",
      inventoryItem,
    });
  } catch (err) {
    return res.status(400).json({
      message: "There was a problem creating the item",
    });
  }
});

app.delete(
  "/api/inventory/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const deletedItem = await InventoryItem.findOneAndDelete({
        _id: req.params.id,
        user: req.user.sub,
      });
      res.status(201).json({
        message: "Inventory item deleted!",
        deletedItem,
      });
    } catch (err) {
      return res.status(400).json({
        message: "There was a problem deleting the item.",
      });
    }
  }
);

app.get("/api/users", requireAuth, async (req, res) => {
  try {
    const users = await User.find()
      .lean()
      .select("_id firstName lastName avatar bio");

    res.json({
      users,
    });
  } catch (err) {
    return res.status(400).json({
      message: "There was a problem getting the users",
    });
  }
});

app.get("/api/bio", requireAuth, async (req, res) => {
  try {
    const { sub } = req.user;
    const user = await User.findOne({
      _id: sub,
    })
      .lean()
      .select("bio");

    res.json({
      bio: user.bio,
    });
  } catch (err) {
    return res.status(400).json({
      message: "There was a problem updating your bio",
    });
  }
});

app.patch("/api/bio", requireAuth, async (req, res) => {
  try {
    const { sub } = req.user;
    const { bio } = req.body;
    const updatedUser = await User.findOneAndUpdate(
      { _id: sub },
      { bio },
      { new: true }
    );

    res.json({
      message: "Bio updated!",
      bio: updatedUser.bio,
    });
  } catch (err) {
    return res.status(400).json({
      message: "There was a problem updating your bio",
    });
  }
});

app.patch("/api/changePassword", requireAuth, async (req, res) => {
  console.log(req.body);
  try {
    const { sub } = req.user;
    const { password } = req.body;
    const hashedPassword = await hashPassword(password);
    const updatedPassword = await User.findOneAndUpdate(
      { _id: sub },
      { password: hashedPassword },
      { new: true }
    );
    res.json({
      message: "Password updated!",
      password: updatedPassword.password,
    });
  } catch (err) {
    return res.status(400).json({
      message: "There was a problem updating your password",
    });
  }
});

async function connect() {
  try {
    mongoose.Promise = global.Promise;
    await mongoose.connect(process.env.ATLAS_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
    });
  } catch (err) {
    console.log("Mongoose error", err);
  }
  app.listen(process.env.PORT || 3001);
  console.log("API listening on");
}

connect();
