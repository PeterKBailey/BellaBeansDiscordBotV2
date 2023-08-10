import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { getVersion } from '../commands/slashCommands/version';

const TextToSVG = require('text-to-svg');
const textToSVG = TextToSVG.loadSync();
 
const attributes = {fill: "red", stroke: "black"};
const options = {x: 0, y: 0, fontSize: 42, anchor: 'top', attributes: attributes};
 

export class ImageMaker {
    public static async getVersionImage(): Promise<Buffer> {
        const topText = textToSVG.getSVG('Bella version ' + getVersion(), options);
        const bottomText = textToSVG.getSVG("IS HERE", options);
        
		return sharp(path.join(__dirname, "../../assets/power.jpg"))
            .resize(400, 225)
            .composite([
                { input: Buffer.from(topText), gravity: "north" },
                { input: Buffer.from(bottomText), gravity: "south"}
            ])
            .toBuffer();
    }
}