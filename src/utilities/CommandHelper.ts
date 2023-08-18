import { BaseInteraction, REST, RESTPostAPIChatInputApplicationCommandsJSONBody, RESTPostAPIContextMenuApplicationCommandsJSONBody, Routes } from 'discord.js';
require("dotenv").config();
import { Command } from './Command';
import { Commands } from '../commands/CommandsIndex';

type JSONBody = (RESTPostAPIContextMenuApplicationCommandsJSONBody | RESTPostAPIChatInputApplicationCommandsJSONBody);

/**
 * Helper class for dealing with commands
 */
export class CommandHelper {
    // registerable format for commands to send to Discord
    private static commands: JSONBody[] = Array.from(Commands.values(), (command: Command) => command.getBuilder().toJSON())

    public static async handleCommand(interaction: BaseInteraction){
        if (!interaction.isCommand()) return;
    
        const command = Commands.get(interaction.commandName);
    
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }
    
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: false });
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: false });
            }
        }
    }

    public static deployCommands(){
        if(!process.env.BOT_TOKEN) throw new Error("Environment requires a bot token!");

        // Construct and prepare an instance of the REST module
        const rest = new REST().setToken(process.env.BOT_TOKEN);

        // deploy commands
        (async () => {
            try {
                console.log(`Started refreshing ${this.commands.length} application (/) commands.`);

                if(!process.env.APP_CLIENT_ID) throw new Error("Environment requires an application id!");
                // The put method is used to fully refresh all commands in the guild with the current set
                const data: any = await rest.put(
                    Routes.applicationCommands(process.env.APP_CLIENT_ID),
                    { body: this.commands },
                );

                console.log(`Successfully reloaded ${data.length} application (/) commands.`);
            } catch (error) {
                // And of course, make sure you catch and log any errors!
                console.error(error);
            }
        })();
    }
}