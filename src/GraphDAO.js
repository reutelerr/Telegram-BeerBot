
const neo4j = require('neo4j-driver');

class GraphDAO {

  constructor() {
    this.driver = neo4j.driver(`bolt://${process.env.GRAPHDB_HOST}`);
  }

  prepare() {
    return new Promise((resolve) => {
      this.run("CREATE CONSTRAINT ON (b:Beer) ASSERT b.id IS UNIQUE", {}).then(() => {
        this.run("CREATE CONSTRAINT ON (u:User) ASSERT u.id IS UNIQUE", {}).then(() => {
          this.run("CREATE CONSTRAINT ON (b:Brewery) ASSERT b.id IS UNIQUE",  {}).then(() => {
            this.run("CREATE CONSTRAINT ON (s:Style) ASSERT s.id IS UNIQUE", {}).then(() => resolve())
          });
        });
      });
    });
  }

  close() {
    return this.driver.close();
  }

  upsertBeerLiked(user, beerId, liked) {
    return this.run(`
      MATCH (b:Beer {id: $beerId})
        MERGE (u:User {id: $userId})
          ON CREATE SET u.isBot = $isBot,
                        u.firstName = $firstName,
                        u.lastName = $lastName,
                        u.username = $username,
                        u.languageCode = $languageCode
          ON MATCH SET  u.isBot = $isBot,
                        u.firstName = $firstName,
                        u.lastName = $lastName,
                        u.username = $username,
                        u.languageCode = $languageCode
        MERGE (u)-[l:LIKED]->(b)
          ON CREATE SET l.rank = $likedRank,
                        l.at = $likedAt
          ON MATCH SET  l.rank = $likedRank,
                        l.at = $likedAt
    `, {
      beerId,
      isBot: user.is_bot,
      firstName: user.first_name,
      lastName: user.last_name,
      languageCode: user.language_code,
      username: user.username,
      userId: this.toInt(user.id),
      likedRank: liked.rank,
      likedAt: this.toDate(liked.at),
    });
  }

  getBeerLiked(userId, movieId) {
    return this.run('MATCH (:User{id: $userId})-[l:LIKED]-(:Beer{id: $beerId}) RETURN l', {
      userId,
      movieId,
    }).then((res) => {
      if (res.records.length === 0) return null;
      else {
        const record = res.records[0].get('l');
        return {
          rank: record.properties.rank,
          at: record.properties.at,
        }
      }
    });
  }

  upsertBeer(beerId, beerName) {
    return this.run('MERGE (b:Beer{id: $beerId}) ON CREATE SET b.name = $beerName RETURN b', {
      beerId,
      beerName,
    })
  }

  upsertBrewery(beerId, brewery) {
    return this.run(`
      MATCH (b:Beer{ id: $beerId })
      MERGE (br:Brewery{id: $breweryId})
        ON CREATE SET br.name = $breweryName
      MERGE (b)-[r:BREWED_BY]->(br)
    `, {
      beerId,
      breweryId: brewery.id,
      breweryName: brewery.name,
    });
  }

  upsertStyle(beerId, style) {
    return this.run(`
      MATCH (b:Beer{ id: $beerId })
      MERGE (s:Style{id: $styleId})
        ON CREATE SET s.name = $styleName
      MERGE (b)-[r:IS_TYPE]->(s)
    `, {
      beerId,
      styleId: style.id,
      styleName: style.name,
    });
  }

  upsertUser(user) {
    return this.run(`
      MERGE (u:User {id: $userId})
      ON CREATE SET u.isBot = $isBot,
                    u.firstName = $firstName,
                    u.lastName = $lastName,
                    u.username = $username,
                    u.languageCode = $languageCode
      ON MATCH SET  u.isBot = $isBot,
                    u.firstName = $firstName,
                    u.lastName = $lastName,
                    u.username = $username,
                    u.languageCode = $languageCode
    `, {
      userId: this.toInt(user.id),
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      languageCode: user.language_code,
      isBot: user.is_bot,
    });
  }

  /*upsertAdded(userId, movieId, added) {
    return this.run(`
      MATCH (m:Movie{ id: $movieId })
      MATCH (u:User{ id: $userId })
      MERGE (u)-[r:ADDED]->(m)
        ON CREATE SET r.at = $at
        ON MATCH SET  r.at = $at
    `, {
      userId: this.toInt(userId),
      movieId,
      at: this.toDate(added.at),
    });
  }*/

  upsertBeerUserLiked(userId, beerId, liked) {
    return this.run(`
      MATCH (b:Beer{ id: $beerId })
      MATCH (u:User{ id: $userId })
      MERGE (u)-[r:LIKED]->(b)
        ON CREATE SET r.at = $at,
                      r.rank = $rank
        ON MATCH SET  r.at = $at,
                      r.rank = $rank
    `, {
      userId: this.toInt(userId),
      beerId,
      at: this.toDate(liked.at),
      rank: this.toInt(liked.rank)
    });
  }

   upsertStyleLiked(userId, styleId, liked) {
    return this.run(`
      MATCH (s:Style{ id: $styleId })
      MATCH (u:User{ id: $userId })
      MERGE (u)-[r:LIKED]->(s)
      ON CREATE SET r.at = $at,
                    r.rank = $rank
      ON MATCH SET  r.at = $at,
                    r.rank = $rank
    `, {
      userId: this.toInt(userId),
      styleId: this.toInt(styleId),
      at: this.toDate(liked.at),
      rank: liked.rank
    });
  }

  upsertBreweryLiked(userId, breweryId, liked) {
    return this.run(`
      MATCH (br:Brewery{ id: $breweryId })
      MATCH (u:User{ id: $userId })
      MERGE (u)-[r:LIKED]->(br)
      ON CREATE SET r.at = $at,
                    r.rank = $rank
      ON MATCH SET  r.at = $at,
                    r.rank = $rank
    `, {
      userId: this.toInt(userId),
      breweryId: this.toInt(breweryId),
      at: this.toDate(liked.at),
      rank: this.toInt(liked.rank)
    });
  }

  /*upsertRequested(userId, movieId, requested) {
    return this.run(`
      MATCH (m:Movie{ id: $movieId })
      MATCH (u:User{ id: $userId })
      MERGE (u)-[r:REQUESTED]->(m)
        ON CREATE SET r.at = $at
        ON MATCH SET  r.at = $at
    `, {
      userId: this.toInt(userId),
      movieId,
      at: this.toDate(requested.at),
    });
  }*/

  upsertCommentAboutBeer(userId, beerId, comment) {
    return this.run(`
      MATCH (b:Beer{ id: $beerId })
      MATCH (u:User{ id: $userId })
      MERGE (c:Comment{ id: $commentId })
        ON CREATE SET c.text = $commentText,
                      c.at = $commentAt
        ON MATCH SET  c.text = $commentText,
                      c.at = $commentAt
      MERGE (u)-[r:WROTE]->(c)
      MERGE (c)-[r:ABOUT]->(b)
    `, {
      userId: this.toInt(userId),
      beerId,
      commentId: this.toInt(comment.id),
      commentAt: this.toDate(comment.at),
      commentText: comment.text
    });
  }

  upsertCommentAboutComment(userId, commentId, comment) {
    return this.run(`
      MATCH (cc:Comment{ id: $commentId })
      MATCH (u:User{ id: $userId })
      MERGE (c:Comment{ id: $subCommentId })
        ON CREATE SET c.text = $subCommentText,
                      c.at = $subCommentAt
        ON MATCH SET  c.text = $subCommentText,
                      c.at = $subCommentAt
      MERGE (u)-[r:WROTE]->(c)
      MERGE (c)-[r:ABOUT]->(cc)
    `, {
      userId: this.toInt(userId),
      commentId: this.toInt(commentId),
      subCommentId: this.toInt(comment.id),
      subCommentAt: this.toDate(comment.at),
      subCommentText: comment.text
    });
  }



  recommendBeers(userId) {//Recommendation based on other user's preferences
    /*
    return this.run(`
      match (u:User{id: $userId})-[l:LIKED]->(m:Movie)<-[:PLAYED_IN]-(a:Actor)-[:PLAYED_IN]->(m2:Movie)<-[l2:LIKED]-(u)
      where id(m) < id(m2) and l.rank > 3 and l2.rank > 3
      return a, count(*)
      order by count(*) desc
      limit 5
    `, {
      userId
    }).then((result) => result.records);
    */
    return this.run(`
      match (u:User{id: $userId})-[l:LIKED]->(b:Beer)<-[l2:LIKED]-(u2:User)-[l3:LIKED]->(b2:Beer)
      where l.rank >= 4 and l2.rank >= 4 and l3.rank >= 4
      return a, count(*)
      order by count(*) desc
      limit 5
    `, {
      userId
    }).then((result) => result.records);
  }

  toDate(value) {
    return neo4j.types.DateTime.fromStandardDate(value);
  }

  toInt(value) {
    return neo4j.int(value);
  }

  run(query, params) {
    const session = this.driver.session();
    return new Promise((resolve) => {
      session.run(query, params).then((result) => {
        session.close().then(() => resolve(result));
      });
    });
  }
}

module.exports = GraphDAO;
