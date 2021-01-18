# Telegram-BeerBot

## Description

This repo contains a telegram bot allowing users to rate beers and get recommendations based on their preferences.

## Implementation

We are using MongoDB for data storage, and Neo4J for data analysis, the bot itself is written in Javascript.

## Setting up & running the bot

- Talk to the BotFather on telegram to register your bot
- Write your telegram API token in the .env.example file and rename it to .env
- Open folder 'scripts' and execute run.sh
- Alternatively, if you do not wish to use docker, although you can also run your databases directly on your machine, just make sure your .env file has the right port numbers for the databases (MongoDB and Neo4J), and then run "npm run import" and "npm run start")

## Usage
### Base commands :
- /help to display help
- /recommendBeer to get recommend beers based on you ratings
- @ the bot to search in beer list

### More commands :
/list_breweries to list breweries. You can then click one to see its list of beers
/list_types to list beer types. You can then click one to see its list of beers
/list_myTopBreweries to list my favourite breweries with their associated ratings
/list_globalTopBreweries to list the overall best rated breweries
/list_myTopTypes to list my favourite beer types with their associated ratings
/list_globalTopTypes to list the overall best rated beer types


 
## Data Schema (Neo4J)

![Schema](Data_Graph.PNG?raw=true "Title")
