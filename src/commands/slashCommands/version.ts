import { ChatInputCommandInteraction, SlashCommandBuilder, } from "discord.js";
import { Command } from "../../utilities/Command";

import fs from 'fs';
import yaml from 'yaml';
import path from 'path';


let data: SlashCommandBuilder = new SlashCommandBuilder()
        .setName('version')
        .setDescription('Get Bella\'s current version.');

let execute = async (interaction: ChatInputCommandInteraction) => {
    const versionYamlPath: string = path.join(__dirname, "../../../version.yaml");
    const yamlContent = fs.readFileSync(versionYamlPath, "utf8" );

    // Parse the YAML content
    const version: string = yaml.parse(yamlContent).version;
    interaction.reply("I'm currently on version " + version + " !");
}
        
        
        
let version = Command.SlashCommand(data, execute);
export {version};