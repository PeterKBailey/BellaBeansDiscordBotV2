// Import Mongo module
const {MongoClient} = require('mongodb');
const uri = process.env.MONGO_URI;

var _db;
const mongoClient = new MongoClient(uri);

module.exports = {
  mongoClient: mongoClient
};