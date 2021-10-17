let mongo = require("../setup/mongo.js");
let react = require("./react.js");

async function execute(message, args){
    // user is asking for results of poll
    let db =  mongo.mongoClient.db('BBBBot');

    if(args[0] == 'results'){
        if(message.reference){
            let foundPoll = await db.collection('polls').findOne({messageId: message.reference.messageID});
            if(foundPoll){
                let replyString = "Question: " + foundPoll.question;
                for(let selection in foundPoll.selections){
                    replyString += "\n" + foundPoll.selections[selection].option + ': ' +  foundPoll.selections[selection].users.length;
                    if(!foundPoll.isPriv && foundPoll.selections[selection].users.length > 0){
                        replyString += '```';
                        for(let userId of foundPoll.selections[selection].users){
                            let username = await db.collection('users').findOne({discordId: userId}, {projection: {"username": true}});
                            if(username) {
                                username = username.username; // that's not confusing lol
                                replyString += username + '\n';
                            } else {
                                replyString += 'Unknown user\n';
                            }
                            
                        }
                        replyString += '```';
                    } 
                }
                message.reply(replyString);
            } else {
                message.reply('This message is not a saved poll!');
            }
        } else {
            message.reply("Reply to the poll you'd like to see the results of!");
        }
        return;
    }

    // user is conducting a new poll
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

        // this is kinda dumb, args should have not been split up to begin with
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
            channelId: null
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
        pollString += "\nNotes:\n" + (isPriv ? 'This is a private poll.' : 'This is not a private poll.') + "\nTo change your selection simply press a different emoji!\nUsers have 15 minutes to make their selection.";
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
        db.collection('polls').insertOne(poll);

    }
   
}



exports.execute = execute;
