import { ChatInputCommandInteraction, SlashCommandBuilder, TextBasedChannel, TextChannel } from "discord.js";
import { Command } from "../../utilities/Command";
import { schedule, ScheduledTask } from "node-cron";
import { load } from 'cheerio';

type AcceptableMethods = "GET" | "POST";

type Options = {
    url: string;
    httpMethod: AcceptableMethods;
    body: string | null;
    contentType: string | null;
    selector: string;
    frequency: string;
    operator: string;
    text: string;
    channel: TextBasedChannel;
    autoCancel: boolean;
};

type Monitor = {
    task: ScheduledTask;
    options: Options;
}

// TODO: persistant storage
let monitors = new Map<string, Monitor>();

let data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('monitor')
    .setDescription('Have Bella monitor a url with a specific predicate.');

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
        const options = parseOptions(interaction);

        const cronExpression = parseCron(options.frequency);
        
        const id = generateId(); 
        const task = schedule(cronExpression, () => monitorCallback(id, options));
        monitorCallback(id, options);
        task.start();
        monitors.set(id, {task, options});

        interaction.reply("Your monitor has an id of `" + id + "` !");
        return;
    }

    // cancelling or checking existing monitor

    const id = interaction.options.getString("id");
    if(!id) throw new Error("Id not provided");

    // check if the task exists, we'll inform that task is not running either way
    const monitor = monitors.get(id);
    if(!monitor){
        interaction.reply(`Monitor ${id} is not running.`);
        return;
    }
    
    if(subcommand == "cancel"){
        cancelMonitor(id, interaction.channel as TextChannel);    
    }
    else if(subcommand == "check"){
        interaction.reply(`Monitor ${id} is checking ${monitor.options.url} every ${monitor.options.frequency}.`);
    }
}

/**
 * get and validate all the options from the interaction
 * @param interaction discord interaction
 * @returns a newly created Options object
 */
function parseOptions(interaction: ChatInputCommandInteraction): Options {
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
        throw new Error("A url must be provided.");
    }
    if(!method || !isAcceptableMethod(method) ){
        throw new Error("A valid http method must be provided.");
    }
    if(!selector){
        throw new Error("A html selector must be provided.");
    }
    if(!operator){
        throw new Error("Comparison operator must be provided.");
    }
    if(!text){
        throw new Error("Text being compared must be provided.");
    }
    if(autoCancel == null){
        throw new Error("Whether monitor should be auto cancelled must be provided.");
    }
    if(!channel){
        if(interaction.channel)
            channel = interaction.channel;
        else
            throw new Error("Unable to determine channel.");
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
        throw new Error("Frequency not properly formatted.");
    }


    let parsedOptions: Options = {
        url: url,
        httpMethod: method as AcceptableMethods,
        body: body,
        contentType: contentType,
        selector: selector,
        operator: operator,
        text: text,
        channel: channel,
        frequency: frequency,
        autoCancel: autoCancel
    };

    return parsedOptions;
}

/**
 * 
 * @param frequency string formatted as (\d+)([mhd])
 */
function parseCron(frequency: string): string {
    let match = frequency.match("(\\d+)([mhd])");
    if(!match)
        throw new Error("Frequency not properly formatted.");
    
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

// https://paulius-repsys.medium.com/simplest-possible-way-to-generate-unique-id-in-javascript-a0d7566f3b0c
function generateId(): string {
    const dateString = Date.now().toString(36)
    const randomness = Math.random().toString(36).substring(2);
    return dateString + randomness;
};

function isAcceptableMethod(value: string): boolean {
    return value === "GET" || value === "POST";
}

async function monitorCallback(monitorId: string, options: Options){
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
            options.channel.send(`My HTTP request was unsuccessful with a status of  ${response.status}!`);
            handleAutoCancel(monitorId, options);
            return;
        }
    
        const html: string = await response.text();
        const $ = load(html);
        const element = $(options.selector);
        const predicate = `"${element.text()}" ${options.operator} "${options.text}"`;
        
        // if the predicate is true, we inform (and may cancel)
        if(eval(predicate)){
            options.channel.send(`${options.url} has met your condition of \`${predicate}\`!`);
            handleAutoCancel(monitorId, options);
        } 
    }
    catch(error){
        options.channel.send("An error occured while trying to make your request.");
        handleAutoCancel(monitorId, options);
    }
}

/**
 * Cancel a monitor and notify the monitor's channel
 * @param monitorId the monitor being cancelled
 */
function cancelMonitor(monitorId: string, channel: TextChannel){
    let message: string = "";
    const monitor = monitors.get(monitorId);
    if(!monitor){
        message += `\nMonitor ${monitorId} is not running.`;
    }
    else {
        // This is the easy way to ensure you only cancel monitors you have access to
        if(monitor.options.channel.id != channel.id){
            monitor.options.channel.send("You must cancel the monitor from the channel it was assigned.")
            return;
        }
        monitor.task.stop();
        monitors.delete(monitorId);
        message += `\nMonitor ${monitorId} has been cancelled.`;
    }
    channel.send(message)
}

function handleAutoCancel(monitorId: string, options: Options){
    if(options.autoCancel){
        cancelMonitor(monitorId, options.channel as TextChannel)
    }
    else{
        options.channel.send(`\nYou can cancel this monitor with \`/monitor cancel ${monitorId}\`.`)
    }
}

let monitor = Command.SlashCommand(data, execute);
export { monitor };