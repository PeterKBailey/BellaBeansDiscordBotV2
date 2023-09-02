import { Message, ApplicationCommandType, ContextMenuCommandInteraction, MessageContextMenuCommandInteraction, ContextMenuCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ModalSubmitInteraction, ModalComponentData } from "discord.js";
import { Command } from "../../utilities/Command";


let data: ContextMenuCommandBuilder = new ContextMenuCommandBuilder()
        .setName('react')
        .setType(ApplicationCommandType.Message);

let execute = async (interaction: ContextMenuCommandInteraction) => {

    // building a modal with a text input
    const modal = new ModalBuilder()
        .setCustomId('reactModal')
        .setTitle('React');

    const heterogramInput = new TextInputBuilder()
            .setCustomId('reactHeterogramInput')
            .setLabel("What string should Bella react with?")
            .setRequired(true)
            .setPlaceholder("Heterogram goes here...")
            .setStyle(TextInputStyle.Short)
            .setMaxLength(36);

    const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(heterogramInput);

    modal.addComponents(firstActionRow);

    // now present it to the user
    await interaction.showModal(modal);
    let modalInteraction: ModalSubmitInteraction; 
    try{
        modalInteraction = await interaction.awaitModalSubmit({time: 20000});
    }
    catch(error){
        interaction.followUp({ content: `You didn't submit a reaction in time.`, ephemeral: true });
        return;
    }

    const reactText = modalInteraction.fields.getTextInputValue("reactHeterogramInput");
    
    const unicodeMap: any = require('../../../assets/unicode_map.json');
    if(isValidHeterogram(reactText, unicodeMap)){
        addReactions(reactText, (interaction as MessageContextMenuCommandInteraction).targetMessage, unicodeMap);
        // we can silently end the interaction
        await modalInteraction.deferUpdate();
    }
    else {
        await modalInteraction.reply({ content: `\`${reactText}\` is not a valid heterogram!`, ephemeral: true });
    }
}
        
function addReactions(text: string, message: Message, unicodeMap: any){
    // Iterate over each character in the heterogram and react with each character.
    for(let char of text){
        message.react(unicodeMap[char]);
    }
}
    
/**
 * @param text the string being checked
 * @param unicodeMap the emoji map the string must work with
 * @returns true if the string is a valid heterogram, false otherwise
 */
function isValidHeterogram(text: string, unicodeMap: any): boolean {
    // Set contains unique elements
    let charSet: Set<string> = new Set<string>();

    // iterate over each character in the string
    for(let char of text){
        // Check if the character exists in the set and is an emoji we can use
        if(charSet.has(char) || !unicodeMap[char]){
            return false;
        } else {
            charSet.add(char);
        }
    }
    // String is a valid heterogram we can react with. Return true.
    return true;
}

// there are no dependencies to worry about
let reactCommand = Command.ContextMenuCommand(data, execute, async () => true);
export { reactCommand };