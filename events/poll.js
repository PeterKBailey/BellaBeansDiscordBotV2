let mongo = require("../setup/mongo.js");

let functions = {
    "results" : results
}

// async function cachePollMsgs(discordClient){
//     // cache all poll messages, needs to be done for on react event to work on old messages
//     let db =  mongo.mongoClient.db('BBBBot');
//     let polls;
//         polls = await db.collection('polls').find({}, {projection: {"_id":false, "messageId":true, "channelId":true}}).toArray();
//     try{
//         for(let poll of polls){
//             let oldmsg = await discordClient.channels.fetch(poll.channelId); 
//             oldmsg = await oldmsg.messages.fetch(poll.messageId);
//         }
//     } catch(err){
//         if(err.message.toLowerCase() === 'missing access'){
//             console.log('\n\nIT SEEMS YOU ARE NOT BELLA (perhaps you are testing with a custom bot), \nPLEASE REFRAIN FROM USING THE DATABASE FUNCTIONALITY LIKE POLL\n\n')
//         }
//     }
// }

async function clearPollReaction(reaction_orig, discordClient){
    let db =  mongo.mongoClient.db('BBBBot');
    let unicodeMap = require('../data/unicode_map.json');

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
            return selections[curEmojiLetter].users.indexOf(userId) < 0 && userId != discordClient.user.id;
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

        // clear reactions, for some reason this doesn't clear all reactions only the new ones I guess idk
        // guess they're not cached but that's weird given that the message really should store all this info
        for(let user of reaction[1].users.cache){
            if(user[1].id != discordClient.user.id){
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
}

async function execute(message, args){
    // user is asking for results of poll
    let db =  mongo.mongoClient.db('BBBBot');
    if(functions[args[0]]){
        // check for specific functionality
        functions[args[0]](message, args, db);
    } else {
        // default to creating new poll
        createPoll(message, args, db);
    }
   
}

/*
    more complicated than it looks, get the replied to poll
    use it's id to find the poll in the db
    check that polls options for users who used it
    only display users if the poll is not set to private
        this involves more queries where we get the username for each user
    reply with the message
*/
async function results(message, args, db){
    if(message.reference){
        let foundPoll = await db.collection('polls').findOne({messageId: message.reference.messageId});
        if(foundPoll){
            message.reply(await pollToString(foundPoll, db));
        } else {
            message.reply('This message is not a saved poll!');
        }
    } else {
        message.reply("Reply to the poll you'd like to see the results of!");
    }
    return;
}

async function pollToString(poll, db){
    let replyString = "Question: " + poll.question;
    for(let selection in poll.selections){
        replyString += "\n" + poll.selections[selection].option + ': ' +  poll.selections[selection].users.length;
        if(!poll.isPriv && poll.selections[selection].users.length > 0){
            replyString += '\n```\n';
            for(let userId of poll.selections[selection].users){
                let user = await db.collection('users').findOne({discordId: userId}, {projection: {"username": true}});
                if(user) {
                    replyString += user.username + '\n';
                } else {
                    replyString += 'Unknown user\n';
                }
                
            }
            replyString += '```';
        } 
    }
    return replyString;
}

async function createPoll(message, args, db){
    let isPriv = false;
    let questionFlag = false;
    let questionText = '';
    let optionFlag = false;
    let optionText = '';
    for(let arg of args){
        // flags for determining what current argument is for
        if(arg == '-pr'){
            isPriv = true;
            questionFlag = false;
            optionFlag = false;
            continue;
        } else if (arg == '-q'){
            questionFlag = true;
            optionFlag = false;
            continue;
        } else if (arg == '-o'){
            optionFlag = true;
            questionFlag = false;
            continue;
        }

        // this is kinda dumb, results from args being split up
        if(questionFlag){
            questionText += ' ' + arg;
        } else if (optionFlag){
            optionText += ' ' + arg;
        }
    }

    // unique options only
    let options = optionText.split(',').filter(function(value, index, self){
        return self.indexOf(value) == index;
    });
    if(options.length > 26){
        message.reply("You can have at most 26 options.");
        return;
    }


    questionText = questionText.trim();
    if(!questionText || !optionText){
        message.reply("You need to add a question and options! Use the help command for more info.");
    } else {
        let unicodeMap = require('../data/unicode_map.json');
        options = options.map(function(value){
            return value.trim();
        })
        let selections =  {};

        let poll = {
            question: questionText,
            selections: selections,
            isPriv: isPriv,
            messageId: null,
            channelId: null,
            serverId: null
        }

        // msg content
        let pollString = "Question: " + questionText + "\nOptions:\n";
        let counter = 0;

        for(let letter in unicodeMap){
            pollString += '`' + letter + ': ' + options[counter] + "`\n";
            selections[letter] = {option: options[counter], users: []};
            counter++;
            if(counter == options.length)
                break;
        }
        pollString += "\nNotes:\n" + (isPriv ? 'This is a private poll.' : 'This is not a private poll.') + "\nTo change your selection simply press a different emoji!";
        let pollMsg = await message.channel.send(pollString); 

        // react with options
        counter = 0;
        for(let letter in unicodeMap){
            await pollMsg.react(unicodeMap[letter]);
            counter++;
            if(counter == options.length)
                break;
        }
        poll.messageId = pollMsg.id;
        poll.channelId = pollMsg.channel.id;
        poll.serverId = pollMsg.guildId;
        db.collection('polls').insertOne(poll);
    }
}


exports.execute = execute;
exports.cachePollMsgs = cachePollMsgs;
exports.clearPollReaction = clearPollReaction;
