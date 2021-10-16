let mongo = require("../setup/mongo.js");


async function execute(message, args){
    
    let db = mongo.getDb();
    let cols = await db.collections();
    console.log("COLLECTIONSS");
    console.log(cols);
    message.reply("yay");
}

exports.execute = execute;