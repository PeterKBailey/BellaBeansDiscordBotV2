//message object, args array
const https = require('https');

function execute(message, args){
    wikiSearch(message, args.map(word => {
        return word[0].toUpperCase() + word.substring(1)}
    ).join('_'));
}
//test sorry
function wikiSearch(message, searchVal) {
    //wikipedia json formatted data
    let url = "https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro&explaintext&redirects=1&titles=" + searchVal;
    let data = "";
    https.get(url, function(response) {
        response.on("data", function(chunk) {
            data += chunk;
        });

        response.on("end", function() {
            let pages = JSON.parse(data).query.pages;
            let about = "";
            for (property in pages) {
                if (pages[property].hasOwnProperty("pageid")) {
                    about = pages[property].extract;
                }
            }
            //grab the first two sentences about the person
            //not perfect, what if a period is used say with a term like jr.
            about = about.substring(0, 400);
            about = about.substring(0, about.lastIndexOf('.'));

            if (about.includes("may refer to:")) {
                message.channel.send("Sorry, too many results!")
                message.channel.send()
            } else if (!about){
                message.channel.send("Sorry, couldnt find them!");
            } else {
                message.channel.send(about + "...");
            }
        });
    }).on("error", function(error) {
        message.channel.send("OML there was an error 🧯🔥 " + error);
    })
}

exports.execute = execute; 