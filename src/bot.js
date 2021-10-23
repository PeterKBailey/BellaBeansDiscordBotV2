require("dotenv").config();
// var mysql = require('mysql');
require("../events/messages")
require("../events/poll.js");


// we store the mongo client object in another JS file that can be required in files that need to access the db
let mongo = require("../setup/mongo.js");

// Import the discord.js module
const { Client, Intents } = require('discord.js');
const messages = require("../events/messages");
const { poll } = require("../events");

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
    // store the messages related to polls in memory
    await poll.cachePollMsgs(client); // takes the discord client
});

// Create an event listener for messages
client.on('messageCreate', message => {
    if (message.author.id !== client.user.id) {
        messages.messageHandler(message);
    }
});


client.on('messageReactionAdd', async (reaction_orig, user) => {
    // if the msg being reacted to is the bot's and the bot isnt the reactor
    if (reaction_orig.message.author.id === client.user.id && reaction_orig.message.author.id != user.id) {
        await poll.clearPollReaction(reaction_orig, client);
    }  
});


client.login(process.env.BBBOT_TOKEN);


process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});