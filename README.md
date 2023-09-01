# Bella Bean's Discord Bot v2: Bella Beyond
Bella Bean's Discord Bot is a project written in TypeScript using the DiscordJs library to create a rich and interactive experience (primarily for the members of the BellaBeansBonstruction Discord server).

Bella is deployed on fly.io and makes use of Docker and GitHub actions for CI/CD.

## Features
- **Trending Emoji Tracking**: Bella can be asked about the most and least used emojis in the server, she tracks actively as the server is used but also has the capability to index the server on command.
- **Role Colouring**: Bella will attempt to automatically set the colour of a role when a user's profile picture changes. She will change the role colour to match the user's picture!
- **URL Monitoring**: Bella can monitor a web page based required HTTP inputs such as the URL and method. She is provided with a selector for a specific HTML element to monitor and a predicate that determines when she will notify you.
- **React**: Bella can react with a heterogram by opening the context menu on a message! The user is prompted with a form to input some text of their choice and Bella will react with the emojis corresponding to each letter.
- **Decide**: Bella can make the hard decisions a little bit easier. Given a few options Bella will pick one out, and can even pick multiple out and rank them as desired. 
- **Version**: Ask Bella what version she is! 

## Details
- Bella uses MongoDb to store data persistently.
- Bella requires access to priveleged intents (Server Members and Message Content) to work properly.
- Bella should be given the highest possible role in the server.

## Requirements
- NPM and Node 18+

## How to start
1. Running a Mongo db is an optional dependency
2. Get all dependencies with `npm install`  
3. Set the required environment variables in your .env file (see example.env)
4. Compile and start with `npm start` (JS will appear in dist directory)
