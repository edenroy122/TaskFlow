const mongoose = require('mongoose');

const connectdb = async () => {
    try{
        const connect = await mongoose.connect(process.env.MONGOOSE);
        console.log("Database Connected ",connect.connection.name)
    }
    catch(err){
        console.log("Database Connection Falied",err)
    }
}

module.exports = connectdb;