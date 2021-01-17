const dotenv = require('dotenv');
const parse = require('csv-parse');
const fs = require('fs').promises;
const cliProgress = require('cli-progress');
const { join } = require('path');

const DocumentDAO = require('./DocumentDAO');
const GraphDAO = require('./GraphDAO');

dotenv.config();

const buildUser = (id, username, first_name, last_name, language_code, is_bot) => ({
  id,
  username,
  first_name,
  last_name,
  language_code,
  is_bot
});

const shuffle = (array) => {

  for(let i = array.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * i);
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }

  return array;
};

const parseBeers = () => new Promise((resolve) => {
  fs.readFile(join(__dirname, '../data/beers.csv')).then((beers) => {
    parse(beers, (err, data) => {
      resolve(data);
    });
  });
});

const users = [
  buildUser(220987852, 'ovesco', 'guillaume', '', 'fr', false),
  buildUser(136451861, 'thrudhvangr', 'christopher', '', 'fr', false),
  buildUser(136451862, 'NukedFace', 'marcus', '', 'fr', false),
  buildUser(136451863, 'lauralol', 'laura', '', 'fr', false),
  buildUser(136451864, 'Saumonlecitron', 'jean-michel', '', 'fr', false),
];

const graphDAO = new GraphDAO();
const documentDAO = new DocumentDAO();


console.log('Starting mongo');
documentDAO.init().then(() => {
  //Clearing the document DB
  documentDAO.deleteAll();

  console.log('Preparing Neo4j');
  graphDAO.prepare().then(() => {

    //Clearing the graph DB
    graphDAO.deleteAll();

    console.log('Writing users to neo4j');
    Promise.all(users.map((user) => graphDAO.upsertUser(user))).then(() => {

      console.log('Parsing CSV and writing beers to mongo');

      //Progress bar for the parsing
      const parseBeersProgressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
      parseBeers().then((parsedBeers) => {
        parseBeersProgressBar.start(parsedBeers.length, 0);
        Promise.all(parsedBeers.map((it) => {
          const [
            id, name, brewery, type, origin
          ] = it;
          return documentDAO.insertBeer({
            id, name, brewery, type, origin
          }).then(() => parseBeersProgressBar.increment());
        })).then(() => {
          parseBeersProgressBar.stop();

          // Load them back to get their id along
          console.log('Loading beers back in memory');
          documentDAO.getAllBeers().then((beers) => {

            // Retrieve all types and breweries from all beers, split them and assign a numeric id
            console.log('Calculating brewery and type');
            const types = [...new Set(beers.flatMap((it) => it.type.split(',').map(it => it.trim())))].map((it, i) => [i, it]);
            const breweries = [...new Set(beers.flatMap((it) => it.brewery.split(',').map(it => it.trim())))].map((it, i) => [i, it]);

            console.log('Handling beer insertion in Neo4j');
            const beersProgressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
            beersProgressBar.start(beers.length, 0);

            Promise.all(beers.map((beer) => new Promise((resolve1) => {
              const beerBreweries = beer.brewery.split(',').map(i => i.trim());
              const beerTypes = beer.type.split(',').map(i => i.trim());

              graphDAO.upsertBeer(beer.id, beer.name).then(() => {
                // Update brewery <-> beer links
                Promise.all(beerBreweries.map((name) => {
                  const id = breweries.find((it) => it[1] === name)[0];
                  return graphDAO.upsertBrewery(beer.id, { id, name });
                })).then(() => {

                  // Update type <-> beer links
                  Promise.all(beerTypes.map((name) => {
                    const id = types.find((it) => it[1] === name)[0];
                    return graphDAO.upsertType(beer.id, { id, name });
                  })).then(() => {
                    beersProgressBar.increment();
                    resolve1();
                  });
                });
              });
            }))).then(() => {
              beersProgressBar.stop();

              /*
              // Add some beers added by users
              console.log('Add some beers liked by users');
              const addedPromise = [400, 87, 0, 34, 58].flatMap((quantity, index) => {
                return shuffle(beers).slice(0, quantity).map((movie) => {
                  return graphDAO.upsertAdded(users[index].id, movie._id, {
                    at: new Date(160613000 * 1000 + (Math.floor(Math.random() * 3124) * 1000))
                  });
                });
              });
              Promise.all(addedPromise).then(() => {*/

                // Add some beers liked by users
                console.log('Add some beers liked by users');
                const likePromise = [280, 34, 98, 254, 0].flatMap((quantity, index) => {
                  return shuffle(beers).slice(0, quantity).map((beer) => {
                    return graphDAO.upsertBeerLiked(users[index], beer.id, {
                      rank: Math.floor(Math.random() * 5) + 1,
                      at: new Date(160613000 * 1000 + (Math.floor(Math.random() * 3124) * 1000))
                    });
                  });
                });
                Promise.all(likePromise).then(() => {

                  // Add some breweries liked by users
                  console.log('Add some breweries liked by users');
                  const breweriesPromise = [300, 674, 0, 45, 36].flatMap((quantity, index) => {
                    return shuffle(breweries).slice(0, quantity).map(([breweryId]) => {
                      return graphDAO.upsertBreweryLiked(users[index].id, breweryId, {
                        rank: Math.floor(Math.random() * 5) + 1,
                        at: new Date(160613000 * 1000 + (Math.floor(Math.random() * 3124) * 1000))
                      });
                    });
                  });
                  Promise.all(breweriesPromise).then(() => {
                    // Add some types liked by users
                    console.log('Add some types liked by users');
                    const typePromise = [22, 3, 0, 4, 7].flatMap((quantity, index) => {
                      return shuffle(types).slice(0, quantity).map((typeId) => {
                        return graphDAO.upsertTypeLiked(users[index].id, typeId, {
                          rank: Math.floor(Math.random() * 5) + 1,
                          at: new Date(160613000 * 1000 + (Math.floor(Math.random() * 3124) * 1000))
                        });
                      });
                    });
                    Promise.all(typePromise).then(() => {
                      /*
                      // Add some beers requested
                      console.log('Add some requested beers');
                      const requestedPromise = [560, 12, 456, 25, 387].flatMap((quantity, index) => {
                        return shuffle(beers).slice(0, quantity).map((movie) => {
                          return graphDAO.upsertRequested(users[index].id, movie._id, {
                            at: new Date(160613000 * 1000 + (Math.floor(Math.random() * 3124) * 1000))
                          });
                        });
                      });
                      Promise.all(requestedPromise).then(() => {
                       */
                        console.log('Done, closing sockets');
                        Promise.all([
                          documentDAO.close(),
                          graphDAO.close()
                        ]).then(() => {
                          console.log('Done with importation');
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    /*});
  });*/
});
