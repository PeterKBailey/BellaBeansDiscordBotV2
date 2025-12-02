import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import { Command } from "../../utilities/Command";
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { GoogleGenerativeAI } from "@google/generative-ai";

puppeteer.use(StealthPlugin());
// Creates bellaGPT command
let data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('tldr')
    .setDescription('Have Bella summarize an article for you')

data.addStringOption(builder =>
    builder
        .setName("url")
        .setDescription("article to summarize")
)

let execute = async (interaction: ChatInputCommandInteraction) => {
    const url = interaction.options.getString('url', true);
    const prompt = "I will provide the plain text of an article. I want you to summarize this article inbetween 5 and 8 bullet points. Each bullet point should start with an emoji that relates to the sentence. Each bullet point should only have 1 sentence. Make sure it is concise and short. The article is as follows: "

    await interaction.deferReply();

    let browser;
    try {
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        // Set user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.goto(url, { waitUntil: 'networkidle2' });

        // Extract text from body
        const pageText = await page.evaluate(() => document.body.innerText);

        console.log("start of article")
        console.log(pageText.slice(0, 500) + "...") // Log first 500 chars
        console.log("end of article")

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Truncate to avoid token limits
        const result = await model.generateContent(prompt + "\n" + pageText.slice(0, 10000));
        const text = result.response.text();
        await interaction.editReply(text);
    } catch (error) {
        console.error(error);
        await interaction.editReply("Sorry, I encountered an error while processing your request.");
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

let tldr = Command.SlashCommand(data, execute, async () => true);
export { tldr };
