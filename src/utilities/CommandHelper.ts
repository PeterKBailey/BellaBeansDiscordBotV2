import { BaseInteraction, REST, RESTPostAPIChatInputApplicationCommandsJSONBody, RESTPostAPIContextMenuApplicationCommandsJSONBody, Routes } from 'discord.js';
require("dotenv").config();
import { Command } from './Command';
import { Commands } from '../commands/CommandsIndex';
import { BellaError } from './BellaError';

type JSONBody = (RESTPostAPIContextMenuApplicationCommandsJSONBody | RESTPostAPIChatInputApplicationCommandsJSONBody);

/**
 * Helper class for dealing with commands
 */
export class CommandHelper {
    public static async handleCommand(interaction: BaseInteraction){
        if (!interaction.isCommand()) return;
    
        const command = Commands.get(interaction.commandName);
    
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }
    
        try {
            await command.execute(interaction);
        } 
        catch (error) {            
            let message: string = "There was an error while executing this command!";
            console.error(error);
            if (error instanceof BellaError && error.getNotifyUser()) {
                message += "\n Error: ```" + error.message +"```";
            } 
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: message, ephemeral: false });
            } else {
                await interaction.reply({ content: message, ephemeral: false });
            }
        }
    }

    public static deployCommands(){
        if(!process.env.BOT_TOKEN) throw new Error("Environment requires a bot token!");

        // Construct and prepare an instance of the REST module
        const rest = new REST().setToken(process.env.BOT_TOKEN);

        // deploy commands
        (async () => {
            // registerable format for commands to send to Discord
            const commands: JSONBody[] = await (async (): Promise<JSONBody[]> => {
                const commands: JSONBody[] = [];
                // loop over the iterator, keep only commands with dependencies we meet
                for(const command of Commands.values()){
                    if(await command.areDependenciesSatisfied()){
                        commands.push(command.getBuilder().toJSON()); 
                    }
                }
                return commands;
            })();

            try {
                console.log(`Started refreshing ${commands.length} application (/) commands.`);

                if(!process.env.APP_CLIENT_ID) throw new Error("Environment requires an application id!");
                // The put method is used to fully refresh all commands in the guild with the current set
                const data: any = await rest.put(
                    Routes.applicationCommands(process.env.APP_CLIENT_ID),
                    { body: commands },
                );

                console.log(`Successfully reloaded ${data.length} application (/) commands.`);
            } catch (error) {
                // And of course, make sure you catch and log any errors!
                console.error(error);
            }
        })();
    }
}