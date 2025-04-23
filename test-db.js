require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
    try {
        console.log('Testing MongoDB connection...');
        
        // Connection options
        const options = {
            serverSelectionTimeoutMS: 20000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            family: 4,
            retryWrites: true,
            retryReads: true,
            w: 'majority'
        };

        console.log('Attempting connection with URI:', process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI, options);

        console.log('✅ MongoDB connected successfully!');
        console.log('Connected to:', mongoose.connection.host);
        console.log('Database:', mongoose.connection.name);
        
        await mongoose.disconnect();
        console.log('Disconnected successfully');
    } catch (err) {
        console.error('❌ Connection error:', err.message);
        console.error('Full error:', err);
        process.exit(1);
    }
}

testConnection();