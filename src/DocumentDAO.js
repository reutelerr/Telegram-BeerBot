const { MongoClient } = require('mongodb');

class DocumentDAO {

  constructor() {
    this.client = null;
    this.db = null;
    this.collection = null;
  }

  init() {
    return new Promise((resolve) => {
      MongoClient.connect(`mongodb://root:toor@${process.env.DOCUMENTDB_HOST}/?authSource=admin`, (err, client) => {
        if (err !== null) throw err;
        this.client = client;
        this.db = client.db(process.env.DOCUMENTDB_NAME);
        this.collection = this.db.collection('mac2020');
        resolve(null);
      });
    });
  }

  close() {
    return this.client.close();
  }

  deleteAll() {
    this.collection.deleteMany();
  }

  insertBeer(beer) {
    return this.collection.insertOne(beer);
  }

  getBeers(search) {
    return this.collection.find({ 'name': new RegExp(search) }).limit(10).toArray();
  }

  getBeerById(id) {
    return this.collection.findOne({ _id: id });
  }

  getRandomBeers(n) {
    return this.collection.find().limit(n).toArray();
  }

  getAllBeers() {
    return this.collection.find().toArray().then((result) => {
      return result.map((it) => ({
        ...it,
        _id: it._id.toString()
      }));
    });
  }
}

module.exports = DocumentDAO;
