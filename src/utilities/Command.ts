import { Base, BaseInteraction, ChatInputCommandInteraction, ContextMenuCommandBuilder, ContextMenuCommandInteraction, DMChannel, SlashCommandBuilder, basename } from "discord.js";

/**
 * This class wraps the necessities for running a command
 * Every command will be an instance of this class with their appropriate logic and builder
 */
export class Command {
    private builder: ContextMenuCommandBuilder|SlashCommandBuilder;
    protected executeLogic: (interaction: ContextMenuCommandInteraction|ChatInputCommandInteraction) => Promise<void>;

    private constructor(builder: any, executeLogic: any){
        this.builder = builder;
        this.executeLogic = executeLogic;
    }

    public static ContextMenuCommand(builder: ContextMenuCommandBuilder, execute: (interaction: ContextMenuCommandInteraction) => Promise<void>){
        return new Command(builder, execute);
    }

    public static SlashCommand(builder: SlashCommandBuilder, execute: (interaction: ChatInputCommandInteraction) => Promise<void>){
        return new Command(builder, execute);
    }

    public getBuilder() : ContextMenuCommandBuilder | SlashCommandBuilder {
        return this.builder;
    }

    public async execute(interaction: BaseInteraction){      
        if(interaction.isUserContextMenuCommand()){
            return this.executeLogic(interaction as ContextMenuCommandInteraction);
        }
        else if(interaction.isChatInputCommand()){
            return this.executeLogic(interaction as ChatInputCommandInteraction);
        }
        interaction.user.createDM().then((channel: DMChannel) => {
            channel.send("Idk what you just did but it's beyond my current abilities!");
        })
        console.log("A user managed to perform an interaction which is not handled by Bella")
    }
}
