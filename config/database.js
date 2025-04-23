const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');

const connectDB = async () => {
    try {
        const options = {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            authSource: 'admin',
            replicaSet: 'atlas-14b4om-shard-0',
            ssl: true,
            family: 4
        };

        console.log('Connecting to MongoDB...');
        const conn = await mongoose.connect(process.env.MONGO_URI, options);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error('MongoDB Connection Error:', error);
        process.exit(1);
    }
};

const getSessionStore = () => {
    return MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions',
        ttl: 24 * 60 * 60,
        autoRemove: 'native',
        // Removed crypto configuration to use default session security
        touchAfter: 24 * 3600 // time period in seconds to update session
    });
};

module.exports = { connectDB, getSessionStore };