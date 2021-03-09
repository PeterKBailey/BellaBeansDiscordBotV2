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
    reminderTime = reminderTime.substr(0, reminderTime.length-1);
    reminderTime = parseInt(reminderTime);
    let multiplicationFactor = timeMap[unit];
    let trueTime = reminderTime*multiplicationFactor;
    if(trueTime >= maxMS){
        message.channel.send(args[args.length-1] + " is too far into the future! My limit is " + Math.floor(maxMS/multiplicationFactor) + unit);
        return;
    }

    let messageText = "";
    let startIndex = -1;
    let messageFound = false;
    for (let i = 0; i < args.length; i++) {
        if(args[i] == '"'){
            if(startIndex < 0){
                startIndex = i;
            } else {
                messageText = args.slice(startIndex+1, i).join(' ');
                messageFound = true;
                break;            
            }
        }
    }

    if(!messageFound){
        message.channel.send(
            "To set a reminder you must follow the format of " + 
            '``` remind me to " do something " in x(s,m,h,d)```'
        );
        return;
    }

    setTimeout(function(){
        message.reply(messageText);
    }, trueTime)
    message.channel.send("I will remind you to " + messageText + " in " + args[args.length-1]);
}

exports.execute = execute;