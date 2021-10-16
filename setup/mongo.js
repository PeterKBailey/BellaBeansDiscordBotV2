// Import Mongo module
const {MongoClient} = require('mongodb');
const uri = process.env.MONGO_URI;

// instance of mongo
const mongoClient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

var _db;

module.exports = {

  connectToServer: async function( ) {
    mongoClient.open(function(err, mongoClient) {
      _db = mongoClient.db("BBBBot");
    });
  },

  getDb: function() {
    return _db;
  },
  
  getClient: function(){
    return mongoClient;
  }
};