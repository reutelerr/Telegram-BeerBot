
const neo4j = require('neo4j-driver');

class GraphDAO {

  constructor() {
    this.driver = neo4j.driver(`bolt://${process.env.GRAPHDB_HOST}`);
  }

  prepare() {
    return new Promise((resolve) => {
      this.run("CREATE CONSTRAINT ON (b:Beer) ASSERT b.id IS UNIQUE", {}).then(() => {
        this.run("CREATE CONSTRAINT ON (u:User) ASSERT u.id IS UNIQUE", {}).then(() => {
          this.run("CREATE CONSTRAINT ON (br:Brewery) ASSERT br.id IS UNIQUE",  {}).then(() => {
            this.run("CREATE CONSTRAINT ON (t:Type) ASSERT t.id IS UNIQUE", {}).then(() => resolve())
          });
        });
      });
    });
  }

  close() {
    return this.driver.close();
  }

  deleteAll() {
    this.run(`MATCH (n) DETACH DELETE n`).then()
  }


  upsertBeerLiked(user, beerId, liked) {
    if(user.last_name === undefined){
      user.last_name = "noLastName";
    }

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

  getBeerLiked(userId, beerId) {
    return this.run('MATCH (:User{id: $userId})-[l:LIKED]-(:Beer{id: $beerId}) RETURN l', {
      userId,
      beerId,
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
    });
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

  upsertType(beerId, type) {
    return this.run(`
      MATCH (b:Beer{ id: $beerId })
      MERGE (t:Type{id: $typeId})
        ON CREATE SET t.name = $typeName
      MERGE (b)-[r:IS_TYPE]->(t)
    `, {
      beerId,
      typeId: type.id,
      typeName: type.name,
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

   upsertTypeLiked(userId, typeId, liked) {
    return this.run(`
      MATCH (s:Type{ id: $typeId })
      MATCH (u:User{ id: $userId })
      MERGE (u)-[r:LIKED]->(s)
      ON CREATE SET r.at = $at,
                    r.rank = $rank
      ON MATCH SET  r.at = $at,
                    r.rank = $rank
    `, {
      userId: this.toInt(userId),
      typeId: this.toInt(typeId),
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
    let scoreTable = [];
    let alreadyLiked = [];
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
    match (u:User{id: $userId})-[l:LIKED]->(b:Beer)
    return b
    `, {
      userId
    }).then((result) => {
      result.records.forEach(record => {
        alreadyLiked.push(record.get('b'))
      });
      return this.run(`
        match (u:User{id: $userId})-[l:LIKED]->(b:Beer)<-[l2:LIKED]-(u2:User)-[l3:LIKED]->(b2:Beer)
        where l.rank >= 4 and l2.rank >= 4 and l3.rank >= 4
        return b2, l, l2, l3
        limit 5
      `, {
        userId
      }).then((result) => {
        result.records.forEach( record => {
          if(!alreadyLiked.includes(record.get('b2'))) {
            let beer = record.get('b2');
            let rank1 = record.get('l').properties.rank;
            let rank2 = record.get('l2').properties.rank;
            let rank3 = record.get('l3').properties.rank;
            if(scoreTable.includes((element) => element.beer === beer)) {
              scoreTable.find((element) => element.beer === beer).rank += rank1+rank2+rank3;
            } else {
              let element = {beer : beer, rank : rank1+rank2+rank3};
              scoreTable.push(element);
            }
          }
        });
        return scoreTable;
      });
    });
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

  listBreweries() {
    return this.run(`
      match (br:Brewery)
      return br
    `, {
    }).then((result) => result.records);
  }

  listTypes() {
    return this.run(`
      match (t:Type)
      return t
    `, {
    }).then((result) => result.records);
  }

  listBreweryBeers(breweryId) {
    return this.run(`
        MATCH (b:Beer)-[BREWED_BY]->(br:Brewery{id: $breweryId})
        RETURN b
    `, {
      breweryId
    }).then((result) => result.records);
  }

  listTypeBeers(typeId){
    return this.run(`
      MATCH (b:Beer)-[IS_TYPE]->(t:Type{id: $typeId})
      RETURN b
    `, {
      typeId
    }).then((result) => result.records);
    
  }

  listUserTopBreweries(userId){
    return this.run(`
      MATCH (u:User {id: $userId})-[LIKED]->(b:Beer)<-[BREWED_BY]->(br:Brewery)
      RETURN size(collect(b)) AS nbLiked, br.name
      ORDER BY nbLiked DESC
    `, {
      userId
    }).then((result) => result.records);
    
  }

  listGlobalTopBreweries(){
    return this.run(`
      MATCH (u:User)-[l:LIKED]->(b:Beer)<-[BREWED_BY]->(br:Brewery)
      RETURN size(collect(b)) AS nbLiked, br.name, AVG(l.rank) AS avgRating
      ORDER BY avgRating DESC
    `, {
    }).then((result) => result.records);
  }
}

module.exports = GraphDAO;
