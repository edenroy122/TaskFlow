const mongoose = require('mongoose');

const connectdb = async () => {
    try {
        const mongoUri = process.env.MONGOOSE || process.env.MONGODB_URI;
        if (!mongoUri) {
            console.error("Database connection error: Neither MONGOOSE nor MONGODB_URI environment variable is defined.");
            return;
        }
        const connect = await mongoose.connect(mongoUri);
        console.log("Database Connected: ", connect.connection.name);
    }
    catch (err) {
        console.error("Database Connection Failed: ", err);
    }
}

module.exports = connectdb;