// Import Mongo module
const {MongoClient} = require('mongodb');
const uri = process.env.MONGO_URI;

// instance of mongo
const mongoClient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

var _db;

module.exports = {

  connectToServer: async function( ) {
    await mongoClient.connect();
    _db = mongoclient.db("BBBBot");
  },

  getDb: function() {
    return _db;
  },
  
  getClient: function(){
    return mongoClient;
  }
};