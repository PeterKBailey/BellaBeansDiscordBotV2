// Import Mongo module
const {MongoClient} = require('mongodb');
const uri = process.env.MONGO_URI;

var _db;


module.exports = {
  mongoClient: mongoClient
};