require("dotenv").config();
// var mysql = require('mysql');
require("../events/messages")

// we store the mongo client object in another JS file that can be required in files that need to access the db
let mongo = require("../setup/mongo.js");

// Import the discord.js module
const { Client, Intents } = require('discord.js');
const messages = require("../events/messages");

// Create an instance of a Discord client
// this is dumb Im just getting every intent, idk how to tell what intents are needed for what
const client = new Client({ intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_BANS,
    Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
    Intents.FLAGS.GUILD_INTEGRATIONS,
    Intents.FLAGS.GUILD_WEBHOOKS,
    Intents.FLAGS.GUILD_INVITES,
    Intents.FLAGS.GUILD_VOICE_STATES,
    Intents.FLAGS.GUILD_PRESENCES,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_MESSAGE_TYPING,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
    Intents.FLAGS.DIRECT_MESSAGE_TYPING
]});

let permissions = {
    dbAccess: true
};

/**
 * The ready event is vital, it means that only _after_ this will your bot start reacting to information
 * received from Discord
*/
client.on('ready', async () => {
    console.log('The bot has started!');
    // connect to db when the bot is ready
    await mongo.mongoClient.connect();

    // cache all poll messages, needs to be done for on react even
    // this code breaks when a bot that is not in all the same servers as the database-stored polls tries to cache messages from those servers
    let db =  mongo.mongoClient.db('BBBBot');
    let polls;
        polls = await db.collection('polls').find({}, {projection: {"_id":false, "messageId":true, "channelId":true}}).toArray();
    try{
        for(let poll of polls){
            let oldmsg = await client.channels.fetch(poll.channelId); 
            oldmsg = await oldmsg.messages.fetch(poll.messageId);
        }
    } catch(err){
        if(err.message.toLowerCase() === 'missing access'){
            console.log('\n\nIT SEEMS YOU ARE NOT BELLA (perhaps you are testing with a custom bot), \nPLEASE REFRAIN FROM USING THE DATABASE FUNCTIONALITY LIKE POLL\n\n')
        }
        // err.m
    }
    
    console.log(polls);
});

// Create an event listener for messages
client.on('messageCreate', message => {
    if (message.author.id !== client.user.id) {
        messages.messageHandler(message);
    }
});


client.on('messageReactionAdd', async (reaction_orig, user) => {
    let db =  mongo.mongoClient.db('BBBBot');
    let unicodeMap = require('../data/unicode_map.json');
   
    // what's odd is only one user reacts at a time for this, so it would be nice if we could just get the reacting user
    // add them to the reacted list, and remove them from the other lists
    // that's what this does but it treats it as an array of users not just one...

    // if the msg being reacted to is the bot's and the bot isnt the reactor
    if (reaction_orig.message.author.id === client.user.id && reaction_orig.message.author.id != user.id) {
        // get reactions / users
        let reactions = reaction_orig.message.reactions.cache;  
        let users = [];
        let selections = await db.collection('polls').findOne({messageId: reaction_orig.message.id}, {projection: {"_id":false, "selections":true}});
        // do not continue if this is not a poll
        if(!selections)
            return
        selections = selections.selections // the selection object is wrapped in another object

        for(let reaction of reactions){
            let curEmojiLetter = Object.keys(unicodeMap).find(key => unicodeMap[key] === reaction[1].emoji.name);

            // get the users, their ids, keep only the new users and non-this-bot users
            let users = reaction[1].users.cache.map(function(user){
                return user.id
            }).filter(function(userId){
                return selections[curEmojiLetter].users.indexOf(userId) < 0 && userId != client.user.id;
            });
            
            // push the new user ids
            selections[curEmojiLetter].users = selections[curEmojiLetter].users.concat(users);
            users = selections[curEmojiLetter].users;
            // now we should look at every other letter
            for(let letter in selections){
                if(letter != curEmojiLetter){
                    // check for users in the other letter that are in this current chosen letter and remove them
                    let otherUsers = selections[letter].users;
                    for(let index in otherUsers){
                        // if the user in this other emoji is in our current users array remove them
                        if(users.indexOf(otherUsers[index]) > -1){
                            otherUsers.splice(index,1); 
                        }
                    }
                    selections[letter].users = otherUsers;
                }
            }
            // guild.members.fetch('66564597481480192')

            // clear reactions, for some reason this doesn't clear all reactions only the new ones I guess idk
            // guess they're not cached but that's weird given that the message really should store all this info
            for(let user of reaction[1].users.cache){
                if(user[1].id != client.user.id){
                    // remove reactions
                    reaction[1].users.remove(user[1]);

                    // add users to database if not there
                    let insertableUser = {discordId: user[1].id, username: user[1].username };
                    let foundU = await db.collection('users').findOne(insertableUser);
                    if(!foundU){
                        db.collection('users').insertOne(insertableUser);
                    }
                }
            }
        }
        // update db with new selections
        db.collection('polls').updateOne({messageId: reaction_orig.message.id}, {$set:{selections: selections}});
        
        return; 
    }  
});


client.login(process.env.BBBOT_TOKEN);


process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});