async function execute(message, args){
    let options;
    if(args.length > 0){
        // options = args;
        message.reply("That doesn't work yet, send the options in a 2nd message!");
    }
    message.reply("What are the options?");

    filter = function(m){
        return m.member.id === message.member.id;
    };
    let collectedMessages = await message.channel.awaitMessages({filter, max:1});

    for(let message of collectedMessages){
        options = message[1].content.split(',');
    }
    for(index in options){
        options[index] = options[index].trim();
    }

    let choice = Math.floor(Math.random()*options.length);
    message.reply("I choose " + options[choice] +'!');
}

exports.execute = execute;
