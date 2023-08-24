import { ChatInputCommandInteraction, SlashCommandBuilder, } from "discord.js";
import { Command } from "../../utilities/Command";

import fs from 'fs';
import yaml from 'yaml';
import path from 'path';

const version: string = getVersion();


let data: SlashCommandBuilder = new SlashCommandBuilder()
        .setName('version')
        .setDescription('Get Bella\'s current version.');

let execute = async (interaction: ChatInputCommandInteraction) => {
    interaction.reply("I'm currently on version " + version + " !");
}

function getVersion(): string {
    const versionYamlPath: string = path.join(__dirname, "../../../version.yaml");
    const yamlContent = fs.readFileSync(versionYamlPath, "utf8" );
    return yaml.parse(yamlContent).version as string;
}
        
function versionToArray(version: string): number[] {
    const versionMatches = version.match(/\d+/g);
    if(!versionMatches){
        throw new Error("Version components can not be parsed from this string!");
    }
    return versionMatches.map(Number);
}
        

/**
 * @returns true if version file exists
 */
async function dependenciesSatisfiedLogic(): Promise<boolean>{
    const versionYamlPath: string = path.join(__dirname, "../../../version.yaml");
    return fs.existsSync(versionYamlPath);
}
        
let versionCommand = Command.SlashCommand(data, execute, dependenciesSatisfiedLogic);
export {versionCommand, version, versionToArray};