const mongoose = require("mongoose");
const MongoStore = require('connect-mongo');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected...");
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

const sessionStore = (session) => {
  return MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collection: 'sessions'
  });
};

module.exports = { connectDB, sessionStore };