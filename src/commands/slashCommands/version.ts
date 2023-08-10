import { ChatInputCommandInteraction, SlashCommandBuilder, } from "discord.js";
import { Command } from "../../utilities/Command";

import fs from 'fs';
import yaml from 'yaml';
import path from 'path';


let data: SlashCommandBuilder = new SlashCommandBuilder()
        .setName('version')
        .setDescription('Get Bella\'s current version.');

let execute = async (interaction: ChatInputCommandInteraction) => {
    // Parse the YAML content
    const version: string = getVersion();
    interaction.reply("I'm currently on version " + version + " !");
}

function getVersion(): string{
    const versionYamlPath: string = path.join(__dirname, "../../../version.yaml");
    const yamlContent = fs.readFileSync(versionYamlPath, "utf8" );
    return yaml.parse(yamlContent).version as string;
}
        
        
        
let version = Command.SlashCommand(data, execute);
export {version, getVersion};