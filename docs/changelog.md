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