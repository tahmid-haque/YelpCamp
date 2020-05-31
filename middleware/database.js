const MongoClient = require("mongodb").MongoClient,
    mongoURL = process.env.DATABASE_URL || "mongodb://localhost:27017",
    client = new MongoClient(mongoURL , {useUnifiedTopology: true});

let db;

async function getDB() {
    if (!db) {
        // Create connection

        await client.connect();

        db = client.db('yelpCamp');

        // Close connection on server close
        [`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach((eventType) => {
            process.on(eventType, () => client.close(process.exit));
        });
    }
    return db;
}

module.exports = {getDB};