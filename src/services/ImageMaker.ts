import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { version } from '../commands/slashCommands/version';

const textToSVG = require('text-to-svg').loadSync();
 

export class ImageMaker {
    public static async getVersionImage(): Promise<Buffer> {
        const attributes = {fill: "red", stroke: "black"};
        const options = {x: 0, y: 0, fontSize: 42, anchor: 'top', attributes: attributes};

        const topText = textToSVG.getSVG('Bella version ' + version, options);
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