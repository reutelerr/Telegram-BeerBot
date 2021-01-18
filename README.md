# Telegram-BeerBot

## Description

This repo contains a telegram bot allowing users to rate beers and get recommendations based on their preferences. Those recommendations can be based on beer type (white, blonde, amber, IPA, etc...), breweries, origin. 

## Implementation

We are using MongoDB for data storage, and Neo4J for data analysis, the bot itself is written in Javascript

## Setting up & running the bot

- Talk to the BotFather on telegram to register your bot
- Write your telegram API token in the .env file
- Run the prepare.sh and run.sh scripts 
 -alternatively, if you do not wish to use docker, although you can also run your databases directly on your machine, just make sure your .env file has the right port numbers for the databases (MongoDB and Neo4J), and then run "npm run import" and "npm run start")

## Usage
### Base commands :
- /help to display help
- /recommend to get a list of top 3 recommended beers according to user's rating (smthing like filter by best type rating then by best brewery rating)
- @MrBeerBot to search in beer list
On beer click -> msg from bot with beer info and rate buttons

### More commands :
- /listBreweries to list breweries
- /listTypes to list types

 
## Data Schema (Neo4J)

![Schema](Data_Graph.PNG?raw=true "Title")
