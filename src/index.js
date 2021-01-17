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

function buildLikeKeyboard(movieId, currentLike) {
  return {
    inline_keyboard: [
      [1,2,3,4,5].map((v) => ({
        text: currentLike && currentLike.rank === v ? "★".repeat(v) : "☆".repeat(v),
        callback_data: v + '__' + movieId, // payload that will be retrieved when button is pressed
        command: 'beerVote',
      })),
    ],
  }
}

// User is using the inline query mode on the bot
bot.on('inline_query', (ctx) => {
  const query = ctx.inlineQuery;
  if (query) {
    documentDAO.getMovies(query.query).then((movies) => {
      const answer = movies.map((movie) => ({
        id: movie._id,
        type: 'article',
        title: movie.title,
        //description: movie.description,
        reply_markup: buildLikeKeyboard(movie._id),
        input_message_content: {
          message_text: stripMargin`
            |Name:      ${movie.title}
            |Brewery:   ${movie.brewery}
            |Type:      ${movie.type}
            |Origin:    ${movie.origin}
          `
        },
      }));
      ctx.answerInlineQuery(answer);  
    });
  }
});

// User chose a movie from the list displayed in the inline query
// Used to update the keyboard and show filled stars if user already liked it
bot.on('chosen_inline_result', (ctx) => {
  if (ctx.from && ctx.chosenInlineResult) {
    graphDAO.getMovieLiked(ctx.from.id, ctx.chosenInlineResult.result_id).then((liked) => {
      if (liked !== null) {
        ctx.editMessageReplyMarkup(buildLikeKeyboard(ctx.chosenInlineResult.result_id, liked));
      }  
    });
  }
});

function handleCallback_beerVote(ctx){
  const [rank, movieId] = ctx.callbackQuery.data.split('__');
  const liked = {
    rank: parseInt(rank, 10),
    at: new Date()
  };

  graphDAO.upsertMovieLiked({
    first_name: 'unknown',
    last_name: 'unknown',
    language_code: 'fr',
    is_bot: false,
    username: 'unknown',
    ...ctx.from,
  }, movieId, liked).then(() => {
    ctx.editMessageReplyMarkup(buildLikeKeyboard(movieId, liked));
  }); 
}

bot.on('callback_query', (ctx) => {
  if (ctx.callbackQuery && ctx.from) {
    const command = ctx.callbackQuery.command
    switch(command){
      case 'beerVote':
        handleCallback_beerVote(ctx);
        break;
      default:
        console.log(`error for command ${command}`);
        break;
    }
    
  }
});


bot.command('help', (ctx) => {
  ctx.reply(`
A demo for the project given in the MAC course at the HEIG-VD.

A user can display a movie and set a reaction to this movie (like, dislike).
When asked, the bot will provide a recommendation based on the movies he liked or disliked.

Use inline queries to display a movie, then use the inline keyboard of the resulting message to react.
Use the command /recommendactor to get a personalized recommendation.
  `);
});

bot.command('start', (ctx) => {
  ctx.reply('HEIG-VD Mac project example bot in javascript');
});

bot.command('recommendactor', (ctx) => {
  if (!ctx.from || !ctx.from.id) {
    ctx.reply('We cannot guess who you are');
  } else {
    graphDAO.recommendActors(ctx.from.id).then((records) => {
      if (records.length === 0) ctx.reply("You haven't liked enough movies to have recommendations");
      else {
        const actorsList = records.map((record) => {
          const name = record.get('a').properties.name;
          const count = record.get('count(*)').toInt();
          return `${name} (${count})`;
        }).join("\n\t");
        ctx.reply(`Based your like and dislike we recommend the following actor(s):\n\t${actorsList}`);
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
      const actorsList = records.map((record) => {
        const name = record.get('g').properties.name;
        return `${name}`;
      }).join("\n\t");
      //ctx.reply(`Breweries:\n\t${actorsList}`);
      const testResult = `Breweries:\n\t${actorsList}`;
      const opts = keyboardFromBreweries(records);
      
      ctx.reply(text=testResult, reply_markup=opts);
  });
});


function keyboardFromBreweries(listBreweries) {
  const breweryButtons = listBreweries.map((record) => {
    const brewery = record.get('g').properties;
    return {
      "text": brewery.name,
      "callback_data": brewery.id
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
      const actorsList = records.map((record) => {
        const name = record.get('a').properties.name;
        return `${name}`;
      }).join("\n\t");

      const testResult = `Types:\n\t${actorsList}`;
      const opts = keyboardFromTypes(records);
      
      ctx.reply(text=testResult, reply_markup=opts);
  });
});

function keyboardFromTypes(listTypes) {
  const typeButtons = listTypes.map((record) => {
    const type = record.get('a').properties;
    return {
      "text": type.name,
      "callback_data": type.id
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