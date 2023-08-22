import { ChatInputCommandInteraction, SlashCommandBuilder, TextBasedChannel } from "discord.js";
import { Command } from "../../utilities/Command";
import { schedule, ScheduledTask } from "node-cron";
import { load } from 'cheerio';
import { MonitorOptions } from "../../data/Monitor";
import { DiscordConnection } from "../../services/DiscordConnection";
import { CommandHelper } from "../../utilities/CommandHelper";
import { ObjectId } from 'mongodb';
import { MongoConnection } from "../../services/MongoConnection";
import { BellaError } from "../../utilities/BellaError";


type Monitor = {
    task: ScheduledTask;
    options: MonitorOptions;
}

// TODO: persistant storage
let monitors = new Map<ObjectId, Monitor>();

// build the new command
let data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('monitor')
    .setDescription('Have Bella monitor a url under a specific predicate.');

// add a monitor
data.addSubcommand(builder => 
    builder
        .setName("add")
        .setDescription("Add a new monitor.")
        // url
        .addStringOption(builder => 
            builder
                .setName("url")
                .setDescription("The full url to be monitored.")
                .setRequired(true)
        )
        // method
        .addStringOption(builder => 
            builder
                .setName("method")
                .setDescription("The http method being used to access the resource.")
                .addChoices(
                    { name: "get", value: "GET" },
                    { name: "post", value: "POST" }
                )
                .setRequired(true)
        )
        // selector
        .addStringOption(builder =>
            builder
                .setName("selector")
                .setDescription("The html selector of the element you want monitored. (Easily copied from web browser).")
                .setRequired(true)
        )
        // text
        .addStringOption(builder => 
            builder
                .setName("text")
                .setDescription("The text being matched against.")
                .setRequired(true)        
        )
        // operator
        .addStringOption(builder =>
            builder
                .setName("comparison-operator")
                .setDescription("The operation being performed.")
                .addChoices(
                    { name: "equal", value: "==" },
                    { name: "not equal", value: "!=" }
                )
                .setRequired(true)
        )
        // auto cancel
        .addBooleanOption(builder => 
            builder
                .setName("auto-cancel")
                .setDescription("The monitor should cancel automatically upon error or completion.")    
                .setRequired(true)
        )
        // body
        .addStringOption(builder => 
            builder
                .setName("body")
                .setDescription("The http body required for accessing the resource.")
                .setRequired(false)
        )
        // content-type
        .addStringOption(builder => 
            builder
                .setName("content-type")
                .setDescription("The body's content-type.")
                .setRequired(false)
        )
        // frequency
        .addStringOption(builder =>
            builder
                .setName("frequency")
                .setDescription("How often Bella should check the url. Minimum/default is every 20m. Structured as xs, xm, xh, xd.")
                .setRequired(false)
            )
        // channel
        .addChannelOption(builder =>
            builder
                .setName("response-channel")
                .setDescription("The channel Bella should send her update to. This channel by default.")
                .setRequired(false)
        )

    );

// cancel a monitor
data.addSubcommand(builder => 
    builder
        .setName("cancel")
        .setDescription("Cancel an existing monitor.")
        .addStringOption(builder => 
            builder
                .setName("id")
                .setDescription("The identifier Bella responded with when the monitor was created.")
                .setRequired(true)
        )
);

// check if a monitor exists
data.addSubcommand(builder => 
    builder
        .setName("check")
        .setDescription("Verify that an existing monitor is running.")
        .addStringOption(builder => 
            builder
                .setName("id")
                .setDescription("The identifier Bella responded with when the monitor was created.")
                .setRequired(true)
        )
);


let execute = async (interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand();
    // adding new monitor
    if(subcommand == "add"){
        const options = parseMonitorOptions(interaction);
        const cronExpression = parseCron(options.frequency);
        
        const mongoDb = (await MongoConnection.getInstance()).db(process.env.MONGO_DB_NAME);
        const id = (await mongoDb.collection("monitors").insertOne({
            cronSchedule: cronExpression,
            options: options
        })).insertedId;

        startMonitor(id, cronExpression, options);
        monitorCallback(id, options); // run callback immediately as well

        interaction.reply("Your monitor has an id of `" + id.toString() + "` !");
        return;
    }

    // cancelling or checking existing monitor
    const idString = interaction.options.getString("id");
    if(!idString) throw new BellaError("Id not provided", true);

    const id = new ObjectId(idString);
    // check if the task exists, we'll inform that task is not running either way
    const monitor = monitors.get(id);
    if(!monitor){
        interaction.reply(`\nMonitor ${id.toString()} does not exist - it may have already been cancelled.`);
        return;
    }
    
    if(subcommand == "cancel"){
        cancelMonitor(id, interaction);    
    }
    else if(subcommand == "check"){
        interaction.reply(`Monitor ${id.toString()} is checking ${monitor.options.url} every ${monitor.options.frequency}.`);
    }
}

/**
 * get and validate all the options from the interaction
 * @param interaction discord interaction
 * @returns a newly created MonitorOptions object
 */
function parseMonitorOptions(interaction: ChatInputCommandInteraction): MonitorOptions {
    const options = interaction.options;
    // required
    const url = options.getString("url");
    const method = options.getString("method");
    const body = options.getString("body");
    const contentType = options.getString("content-type");
    const selector = options.getString("selector");
    const operator = options.getString("comparison-operator"); 
    const text = options.getString("text"); 
    const autoCancel = options.getBoolean("auto-cancel");
    // optional
    let channel = options.getChannel("response-channel") as TextBasedChannel;
    let frequency = options.getString("frequency");

    // verify and set up default values
    if(!url){
        throw new BellaError("A url must be provided.", true);
    }
    if(!method || !isAcceptableMethod(method) ){
        throw new BellaError("A valid http method must be provided.", true);
    }
    if(!selector){
        throw new BellaError("A html selector must be provided.", true);
    }
    if(!operator){
        throw new BellaError("Comparison operator must be provided.", true);
    }
    if(!text){
        throw new BellaError("Text being compared must be provided.", true);
    }
    if(autoCancel == null){
        throw new BellaError("Whether monitor should be auto cancelled must be provided.", true);
    }
    if(!channel){
        if(interaction.channel)
            channel = interaction.channel;
        else
            throw new BellaError("Unable to determine channel.", true);
    }
    if(!frequency){
        frequency = "20m";
    }

    // (a match must exist, it must be greater than 20m, the match must be the entire string)
    let frequencyMatch = frequency.match("(\\d+)([mhd])");
    if(!frequencyMatch 
        || (frequencyMatch[2] == "m" && parseInt(frequencyMatch[1]) < 20)
        || frequency != frequencyMatch[0]
    ){
        throw new BellaError("Frequency not properly formatted.", true);
    }


    let parsedMonitorOptions: MonitorOptions = {
        url: url,
        httpMethod: method,
        body: body,
        contentType: contentType,
        selector: selector,
        operator: operator,
        text: text,
        channelId: channel.id,
        frequency: frequency,
        autoCancel: autoCancel
    };

    return parsedMonitorOptions;
}

/**
 * 
 * @param frequency string formatted as (\d+)([mhd])
 */
function parseCron(frequency: string): string {
    let match = frequency.match("(\\d+)([mhd])");
    if(!match)
        throw new BellaError("Frequency not properly formatted.", true);
    
    // get the number and time unit
    const freq = match[1];
    const unit = match[2];

    // replace placeholders
    // need to think about this - lower units become 0, higher become *
    let cronString: string = "m h d * *";

    // 1. get the index of our unit
    const unitIndex = cronString.indexOf(unit);
    // 2. replace letters up to the unit with 0
    while((cronString = cronString.replace(/[a-zA-Z]/, "0")).at(unitIndex) != "0");
    // 3. fix the unit
    cronString = cronString.replace(/0(?!\s0)/, freq);
    // 4. replace letters after the unit with *
    cronString = cronString.replace(/[a-zA-Z]/g, "*");

    return cronString;
}

function isAcceptableMethod(value: string): boolean {
    return value === "GET" || value === "POST";
}

async function monitorCallback(monitorId: ObjectId, options: MonitorOptions){
    // this function does not operate on the main thread so it needs its own error handling
    try{
        const response: Response = await fetch(options.url, {
            "headers": {
                "content-type": options.contentType ?? "",
            },
            "body": options.body,
            "method": options.httpMethod
        });
    
        // notify (and/or cancel) if request failed
        if(!response.ok){
            sendToTextChannel(`My HTTP request was unsuccessful with a status of  ${response.status}!`, options.channelId);
            handleAutoCancel(monitorId, options);
            return;
        }
    
        const html: string = await response.text();
        const $ = load(html);
        const element = $(options.selector);
        const predicate = `"${element.text()}" ${options.operator} "${options.text}"`;
        
        // if the predicate is true, we inform (and may cancel)
        if(eval(predicate)){
            sendToTextChannel(`${options.url} has met your condition of \`${predicate}\`!`, options.channelId);
            handleAutoCancel(monitorId, options);
        } 
    }
    catch(error){
        sendToTextChannel(`An error occured while trying to make and parse the request for monitor \`${monitorId.toString()}\`.`, options.channelId);
        handleAutoCancel(monitorId, options);
    }
}


/**
 * Start a monitor, saving it to the local map
 * @param id the mongo id
 * @param cronExpression the cron schedule as a string
 * @param options the options given by the user
 */
function startMonitor(id: ObjectId, cronExpression: string, options: MonitorOptions){
    const task = schedule(cronExpression, () => monitorCallback(id, options));
    task.start();
    monitors.set(id, {task, options});
}


/**
 * cancels a monitor if it exists
 * @param monitorId the id of monitor being cancelled
 * @param interaction the chat interaction if there was one prompting cancellation
 * @returns true if cancelled, false otherwise
 */
async function cancelMonitor(monitorId: ObjectId, interaction?: ChatInputCommandInteraction){
    let message: string;;
    const monitor = monitors.get(monitorId);

    // if there is no monitor we indicate such
    if(!monitor){
        // if there is no monitor and we are not cancelling in reponse to a user we can return
        if(!interaction) return false;

        interaction.reply(`\nMonitor ${monitorId.toString()} does not exist - it may have already been cancelled.`);
    }
    else {
        // ensures users can only cancel monitors made in channels they have access to
        if(interaction && monitor.options.channelId != interaction.channelId){
            interaction.reply("You must cancel the monitor from the channel it was assigned.")
            return false;
        }

        // stop and delete the monitor
        monitor.task.stop();
        monitors.delete(monitorId);
        const mongoDb = (await MongoConnection.getInstance()).db(process.env.MONGO_DB_NAME);
        await mongoDb.collection("monitors").deleteOne({_id: new ObjectId(monitorId)})

        // notify the user
        message = `\nMonitor ${monitorId.toString()} has been cancelled.`;
        if(interaction){
            interaction.reply(message);
        }
        else {
            sendToTextChannel(message, monitor.options.channelId);
        }

        return true;
    }
}

/**
 * wraps logic needed for checking whether a monitor gets auto cancelled
 * @param monitorId the id of monitor considering being  cancelled
 * @param options the options for the monitor
 */
async function handleAutoCancel(monitorId: ObjectId, options: MonitorOptions){
    if(options.autoCancel){
        cancelMonitor(monitorId)
    }
    else{
        sendToTextChannel(`\nYou can cancel this monitor with \`/monitor cancel ${monitorId.toString()}\`.`, options.channelId)
    }
}

async function sendToTextChannel(message: string, channelId: string){
    const discordClient = await DiscordConnection.getInstance();
    const channel = await discordClient.channels.fetch(channelId) as TextBasedChannel;
    // what to do if the channel was deleted?
    channel?.send(message);
}

let monitorCommand = Command.SlashCommand(data, execute);
export { monitorCommand, startMonitor };