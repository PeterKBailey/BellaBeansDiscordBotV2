import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import { Command } from "../../utilities/Command";

let data: SlashCommandBuilder = new SlashCommandBuilder()
        .setName('decide')
        .setDescription('Bella makes a decision for you among your given options :)');

// add 10 string options lol, first 2 are required
for(let x = 1; x < 11; ++x){
    data.addStringOption(builder => 
        builder
            .setName("option"+x)
            .setDescription("option "+ x)
            .setRequired(x < 3)
    )
}

// how many options should be selected?
data.addIntegerOption(builder => 
    builder
        .setName("num-to-choose")
        .setDescription("How many options should be chosen. Default 1.")
        .setRequired(false)
);

// should the selected options be ranked?
data.addBooleanOption(builder => 
    builder
        .setName("ranked")
        .setDescription("Should the chosen options be ordered? Default not.")
        .setRequired(false)
);
        
let execute = async (interaction: ChatInputCommandInteraction) => {
    let options: string[] = [];

    // get all the given options
    for(let x = 1; x < 11; ++x){
        let optionX: string|null = interaction.options.getString("option"+x);
        if(!optionX){
            continue;
        }
        options.push(optionX);
    }

    // build a response
    let response: string = "```";
    const ranked: boolean = interaction.options.getBoolean("ranked") ? true : false;
    const numToChoose: number = interaction.options.getInteger("num-to-choose") ?? 1;
    const numOptions = options.length;
    for(let x = 0; x < numToChoose && x < numOptions; ++x){
        let selectedOption = options.splice(getRandomInt(0, options.length), 1)[0];
        response += (ranked ? x+1 : '-') + " " + selectedOption + '\n';
    }

    interaction.reply(response+"```");
}

/**
 * @param min min number to pick, inclusive
 * @param max max number to pick, exclusive
 * @returns a random int between min and max
 */
function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
}


let decide = Command.SlashCommand(data, execute);
export {decide};