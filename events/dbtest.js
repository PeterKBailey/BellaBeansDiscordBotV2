let mongo = require("../setup/mongo.js");

async function execute(message, args){
    try{
        let db =  mongo.mongoClient.db('BBBBot');
        let collections = await db.listCollections().toArray();
        let collectionNames = collections.map(c => c.name);
        console.log(collectionNames);
        let userColName = 'users';
        // if there is not users collection make one
        if (collectionNames.indexOf(userColName) < 0) {
            await db.createCollection(userColName);
        } 
        let user = {username: message.author.username};
        // if the messaging user isn't recorded, insert them
        let foundU = await db.collection(userColName).findOne(user);
        if (!foundU){
            console.log('adding');
            foundU = await db.collection(userColName).insertOne(user);
        }
        message.reply(foundU.username);
    } catch(err) {
        console.error(err);
        message.reply("Database error!")
    }
}

exports.execute = execute;