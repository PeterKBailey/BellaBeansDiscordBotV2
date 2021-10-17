

function execute(message, args){
    let commands = "";
    let obj = require("./index.js");

    if(args.length == 0){
        for(command of Object.keys(obj)){
            commands += "`" + command + "`" + "\n";
        }
        message.channel.send("I know how to do many things!\n" + commands + "to find out more about a command try help [command]");
    } else {
        let helpText = require("./../data/help_text.json");
        let text = helpText[args[0]];
        if(text)
            message.channel.send(text);
        else
            message.channel.send("I don't know that command!");
    }
    
}
exports.execute = execute;
