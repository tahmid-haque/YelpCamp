const MongoClient = require("mongodb").MongoClient,
    mongoURL = process.env.DATABASE_URL || "mongodb://localhost:27017",
    client = new MongoClient(mongoURL , {useUnifiedTopology: true});

let db;

function getDB() {
    console.log(mongoURL);
    if (!db) {
        // Create connection
        client.connect(err => {
            if (err) throw err;
        });
        db = client.db("yelpCamp");

        // Close connection on server close
        [`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach((eventType) => {
            process.on(eventType, () => client.close(process.exit));
        });
    }
    return db;
}

function checkDbConnection(req, res, next) {
    if (client.isConnected()) return next();
    req.flash('error', 'Something went wrong... please try again.');
    res.render('landing');
}

module.exports = {getDB, checkDbConnection}