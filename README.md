# Telegram-BeerBot

## Description

This repo contains a telegram bot allowing users to rate beers and get recommendations based on their preferences. Those recommendations can be based on beer type (white, blonde, amber, IPA, etc...), breweries, origin. 

## Implementation

We are using MongoDB for data storage, and Neo4J for data analysis, the bot itself is written in Javascript

## Usage
Base commands :
 /help to display help
 /beers to display beers
  then possibility to click on beer and rate
 /recommend to get a list of top 3 recommended beers according to user's rating (smthing like filter by best type rating then by best brewery rating)