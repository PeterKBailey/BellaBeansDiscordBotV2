let timeMap = {
    's' : 1000,
    'm' : 60000,
    'h' : 3600000,
    'd' : 8640000
}
let maxMS = 2147483647;
function execute(message, args){
    let reminderTime = args[args.length-1];
    let unit = reminderTime.charAt(reminderTime.length-1);
    reminderTime = reminderTime.substr(0, reminderTime.length-2);
    reminderTime = parseInt(reminderTime);
    let multiplicationFactor = timeMap[unit];
    let trueTime = reminderTime*multiplicationFactor;
    if(trueTime >= maxMS){
        message.channel.send(reminderTime + " is too far into the future! My limit is " + Math.floor(maxMS/multiplicationFactor) + unit);
        return;
    }

    let messageText = "";
    for (var i = args.length - 2; i >= 0; i--) {
        if(args[i] == '"'){
            messageText = args.slice(0, i).join(' ');
            break;
        }
    }
    setTimeout(function(){
        message.reply(messageText);
    }, trueTime)
    message.channel.send("I will remind you to " + messageText + " in " + args[args.length-1]);
}

exports.execute = execute;