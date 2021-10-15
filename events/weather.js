
const https = require('https');

function execute(message, args){

    if(!args[2]){
        args[1] = getCountry(args[1]);
    } else {
        args[2] = getCountry(args[2])
    }


    let url = "https://api.openweathermap.org/data/2.5/weather?q="
    // url+=city + "," + region + "," + country +;
    for(let i = 0; i < 3; ++i){
        if(args[i]){
            url+=args[i]+",";
        }
    }
    url+="&appid="+process.env.OWMAPI;
    https.get(url, function(response) {
        let data = "";
        response.on("data", function(chunk) {
            data += chunk;
        });

        response.on("end", function() {
            data = JSON.parse(data);
            let currentTemp;
            let feelsLike;
            try{
                currentTemp = data.main.temp;
                currentTemp-=273.15;
                feelsLike =  data.main.feels_like;
                feelsLike-=273.15;
            } catch (error) {
                message.reply("To use the weather functionality do: ```weather city, region code (2 letters), country``` or ```weather city, country```" );
                console.error(error);
                return;
            }
            
            let weather = data.weather[0].description;
            if(!weather){
                weather = data.weather[0].main;
            }
            message.channel.send("Curent Weather in " + data.name + ", " + data.sys.country + ": " + weather + '\n' + Math.round(currentTemp) + " deg cels, " + "feels like: " + Math.round(feelsLike) + " deg cels");
        });
    }).on("error", function(error) {
        message.channel.send("Sorry no data!" + error);
    })
}

function getCountry(country){
    let countryMap = require("./../data/country_map.json");
    for(map of countryMap){
        if(map.name.toLowerCase() === country){
            return map.code.toLowerCase();
        }
    }
    return country;
}
exports.execute = execute;