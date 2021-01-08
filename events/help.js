

function execute(message, args){
    let commands = "";
    let obj = require("./index.js");
    console.log(obj);
    for(command of Object.keys(obj)){
        commands += "`" + command + "`" + "\n";
    }
    console.log(commands);
    message.channel.send("I know how to do many things!\n" + commands);
}
exports.execute = execute;
