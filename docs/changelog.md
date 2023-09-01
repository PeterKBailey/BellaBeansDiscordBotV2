## Version 2.6.0 - 2023-09-01
### Added
- React command!
- Automatic role colour setting!!

## Version 2.5.2 - 2023-08-31
### Fixed
- Bella awaits interaction replys now so that if she doesn't respond in time the error gets handled
- Bella's response message for trending emojis is limited to 2000 characters.
### Changed
- Instead of the id of discord emojis, we store the toString representation of them - this is better since emojis may get deleted from guilds and this way we can see the name
## Added
- Users can specify if they want to see trending emojis sorted by least popular now

## Version 2.5.1 - 2023-08-28
### Fixed
- Bella ran out of memory while indexing, unfortunately the best resolution will likely slow her down
### Added
- DiscordConnection has a new method for processing a channel's messages which will be more reusable


## Version 2.5.0 - 2023-08-27
### Added
- Emoji tracking!!! When emojis are used it is stored in mongo so we can see the most popular emojis
- Emoji indexing. Bella will scrape the entire server to store emoji usage.

### Changed
- If mongo can't be reached the instance is null instead of an error. This is more appropriate since mongo is now an optional dependency.

## Version 2.4.3 - 2023-08-24
### Added
- Dependency requirements for commands. Commands now must provide a function indicating if they can be used.
- Mongo is now an optional dependency! Easier for development if making a command requiring no persistent storage! 

## Version 2.4.2 - 2023-08-22
### Fixed
- Local monitor map could not be used with ObjectId objects since new ObjectId objs were created from the strings
- Fixed so now the object id strings are used as the keys

## Version 2.4.1 - 2023-08-21
### Fixed
- Discord client instance was checking mongo creds... now looks at bot token

## Version 2.4.0 - 2023-08-21
### Added
- Mongo Support!! Bella checks her version with mongo before spamming guilds that she's online
- Monitors are now stored with Mongo
- Discord and Mongo clients accessed as singletons

## Version 2.3.3 - 2023-08-19
### Fixed
- Interaction now replys when user cancels monitor

## Version 2.3.2 - 2023-08-17
### Added
- Error handling for callback function so Bella doesn't crash

## Version 2.3.1 - 2023-08-17
### Changed
- dockerfile node version

## Version 2.3.0 - 2023-08-17
### Added
- "monitor" slash command!
- The monitor slash command is a way to have Bella monitor a url periodically for some predicate based on an html locator.


## Version 2.2.0 - 2023-08-09
### Added
- Bella now notifies all servers that she is up and running along with her version number
- Multiple image libraries were required to make this...

## Version 2.1.0 - 2023-08-09
### Added
- "version" slash command


## Version 2.0.0 - 2023-08-09

### Initial Release
- Basic project structure
- "decide" slash command example