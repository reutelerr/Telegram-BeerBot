const dotenv = require('dotenv');
const Telegraf = require('telegraf');
const DocumentDAO = require('./DocumentDAO');
const GraphDAO = require('./GraphDAO');

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const graphDAO = new GraphDAO();
const documentDAO = new DocumentDAO();

function stripMargin(template, ...expressions) {
  const result = template.reduce((accumulator, part, i) => {
    return accumulator + expressions[i - 1] + part;
  });
  return result.replace(/(\n|\r|\r\n)\s*\|/g, '$1');
}

function buildLikeKeyboard(beerId, currentLike) {
  return {
    inline_keyboard: [
      [1, 2, 3, 4, 5].map((v) => ({
        text: currentLike && currentLike.rank === v ? "★".repeat(v) : "☆".repeat(v),
        callback_data: 'beerVote' + '__' + v + '__' + beerId // payload that will be retrieved when button is pressed
      })),
    ],
  }
}

// User is using the inline query mode on the bot
bot.on('inline_query', (ctx) => {
  const query = ctx.inlineQuery;
  if (query) {
    documentDAO.getBeers(query.query).then((beers) => {
      const answer = beers.map((beer) => ({
        id: beer.id,
        type: 'article',
        title: beer.name,
        //description: beer.description,
        reply_markup: buildLikeKeyboard(beer.id),
        input_message_content: {
          message_text: stripMargin`
            |Name:      ${beer.name}
            |Brewery:   ${beer.brewery}
            |Type:      ${beer.type}
            |Origin:    ${beer.origin}
          `
        },
      }));
      ctx.answerInlineQuery(answer);
    });
  }
});

// User chose a beer from the list displayed in the inline query
// Used to update the keyboard and show filled stars if user already liked it
bot.on('chosen_inline_result', (ctx) => {
  if (ctx.from && ctx.chosenInlineResult) {
    graphDAO.getBeerLiked(ctx.from.id, ctx.chosenInlineResult.result_id).then((liked) => {
      if (liked !== null) {
        ctx.editMessageReplyMarkup(buildLikeKeyboard(ctx.chosenInlineResult.result_id, liked));
      }
    });
  }
});

function handleCallback_beerVote(rank, beerId, ttUser, ctx) {
  const liked = {
    rank: parseInt(rank, 10),
    at: new Date()
  };

  let user = {
    first_name: ttUser.first_name,
    last_name: ttUser.last_name,
    language_code: 'fr',
    is_bot: false,
    username: ttUser.username,
    ...ttUser,
  }

  graphDAO.upsertBeerLiked(user, beerId, liked).then(() => {
    ctx.editMessageReplyMarkup(buildLikeKeyboard(beerId, liked));
  });
}

function handleCallback_selectBrewery(breweryId, ctx) {
  let breweryIdInt = Number(breweryId);
  graphDAO.listBreweryBeers(breweryIdInt).then((beers) => {
    const beerList = beers.map((record) => {
      const name = record.get('b').properties.name;
      return `${name}`;
    }).join("\n\t");
    ctx.reply(`This brewery has the following beers :\n\t${beerList}`);
  });
}

function handleCallback_selectType(typeId, ctx) {
  let typeIdInt = Number(typeId);
  graphDAO.listTypeBeers(typeIdInt).then((beers) => {
    const beerList = beers.map((record) => {
      const name = record.get('b').properties.name;
      return `${name}`;
    }).join("\n\t");
    ctx.reply(`Beers from this type :\n\t${beerList}`);
  });
}

bot.on('callback_query', (ctx) => {
  if (ctx.callbackQuery && ctx.from) {
    const command = ctx.callbackQuery.data.split('__')[0];
    switch (command) {
      case 'beerVote':
        const [, rank, beerId] = ctx.callbackQuery.data.split('__');
        handleCallback_beerVote(rank, beerId, ctx.from, ctx);
        break;
      case 'brewerySelect':
        const [, breweryId] = ctx.callbackQuery.data.split('__');
        handleCallback_selectBrewery(breweryId, ctx);
        break;
      case 'typeSelect':
        const [, typeId] = ctx.callbackQuery.data.split('__');
        handleCallback_selectType(typeId, ctx);
        break;
      default:
        console.log(`error for command ${command}`);
        break;
    }

  }
});


bot.command('help', (ctx) => {
  ctx.reply(`
Project for the MAC course at the HEIG-VD.

You can search in our beer database, select a beer and give it a rating.
When asked, the bot will provide a recommendation based on the beers you rated.

Use inline queries to display a beer, then use the inline keyboard of the resulting message to react.
Use the command /recommendBeer to get a personalized recommendation.

/list_breweries to list breweries. You can then click one to see its list of beers
/list_types to list beer types. You can then click one to see its list of beers
/list_myTopBreweries to list my favourite breweries with their associated ratings
/list_globalTopBreweries to list the overall best rated breweries
/list_myTopTypes to list my favourite beer types with their associated ratings
/list_globalTopTypes to list the overall best rated beer types

  `);
});

bot.command('start', (ctx) => {
  ctx.reply('HEIG-VD Mac project example bot in javascript');
});

bot.command('recommendBeer', (ctx) => {
  let beerScores;
  if (!ctx.from || !ctx.from.id) {
    ctx.reply('We cannot guess who you are');
  } else {
    graphDAO.recommendBeers(ctx.from.id).then((beerScores) => {
      if (beerScores.length === 0) ctx.reply("You haven't liked enough beers to have recommendations");
      else {
        const beerList = beerScores.map((record) => {
          const name = record.beer.properties.name;
          const rank = record.rank.toFixed(2);
          return `${name} (${rank}%)`;
        }).join("\n\t");
        ctx.reply(`Based on  your votes we recommend the following beer(s):\n\t${beerList}`);
      }
    });
  }
});


// Initialize mongo connexion
// before starting bot
documentDAO.init().then(() => {
  bot.startPolling();
});


bot.command('list_breweries', (ctx) => {
  graphDAO.listBreweries().then((records) => {
    const breweriesList = records.map((record) => {
      const name = record.get('br').properties.name;
      return `${name}`;
    }).join("\n\t");
    //ctx.reply(`Breweries:\n\t${breweriesList}`);
    const testResult = `Breweries:\n\t${breweriesList}`;
    const opts = keyboardFromBreweries(records);

    ctx.reply(text = testResult, reply_markup = opts);
  });
});


function keyboardFromBreweries(listBreweries) {
  const breweryButtons = listBreweries.map((record) => {
    const brewery = record.get('br').properties;
    return {
      "text": brewery.name,
      "callback_data": 'brewerySelect' + '__' + brewery.id
    };
  });

  return {
    "reply_markup": {
      "inline_keyboard": [
        breweryButtons
      ]
    }
  };
}

bot.command('list_types', (ctx) => {
  graphDAO.listTypes().then((records) => {
    const typeList = records.map((record) => {
      const name = record.get('t').properties.name;
      return `${name}`;
    }).join("\n\t");

    const testResult = `Types:\n\t${typeList}`;
    const opts = keyboardFromTypes(records);

    ctx.reply(text = testResult, reply_markup = opts);
  });
});

function keyboardFromTypes(listTypes) {
  const typeButtons = listTypes.map((record) => {
    const type = record.get('t').properties;
    return {
      "text": type.name,
      "callback_data": 'typeSelect' + '__' + type.id
    };
  });

  return {
    "reply_markup": {
      "inline_keyboard": [
        typeButtons
      ]
    }
  };
}

bot.command('list_myTopBreweries', (ctx) => {
  if (!ctx.from || !ctx.from.id) {
    ctx.reply('We cannot guess who you are');
  } else {
    graphDAO.listUserTopBreweries(ctx.from.id).then((records) => {
      if (records.length === 0) ctx.reply("You haven't liked enough beers to have stats");
      else {
        const beerList = getRatings(records);
        ctx.reply(`Your top breweries :\n\t${beerList}`);
      }
    });
  }
});

bot.command('list_globalTopBreweries', (ctx) => {
  graphDAO.listGlobalTopBreweries().then((records) => {
    const beerList = getRatings(records);
    ctx.reply(`Top breweries :\n\t${beerList}`);
  });
});

bot.command('list_myTopTypes', (ctx) => {
  if (!ctx.from || !ctx.from.id) {
    ctx.reply('We cannot guess who you are');
  } else {
    graphDAO.listUserTopTypes(ctx.from.id).then((records) => {
      if (records.length === 0) ctx.reply("You haven't liked enough beers to have stats");
      else {
        const beerList = getRatings(records);
        ctx.reply(`Your top types :\n\t${beerList}`);
      }
    });
  }
});

bot.command('list_globalTopTypes', (ctx) => {
  graphDAO.listGlobalTopTypes().then((records) => {
    const beerList = getRatings(records);
    ctx.reply(`Top types :\n\t${beerList}`);
  });
});

function getRatings(records) {
  return records.map((record) => {
    const name = record.get('name');
    const nbVotes = record.get('nbLiked');
    const avgRating = record.get('avgRating').toFixed(1);
    return `${name} | avg rating: ${avgRating} (based on ${nbVotes} votes)`;
  }).join("\n\t");
}
