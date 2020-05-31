const session = require("express-session"),
    passport = require('passport'),
    LocalStrategy = require("passport-local").Strategy,
    bcrypt = require('bcrypt'),
    database = require("./database"),
    mongoID = require("mongodb").ObjectID;

function init(app) {
    passport.serializeUser((user, done) => {done(null, user._id)});
    passport.deserializeUser(async (id, done) => {
        let db = await database.getDB();

        if (!mongoID.isValid(id)) req.failure(res, "Invalid ID");
        db.collection('users').findOne({_id: mongoID(id)}, (err, user) => {
            done(err, user);
        });
    });

    passport.use(new LocalStrategy(
        async function (username, password, done) {
            let db = await database.getDB();

            db.collection('users').findOne({username}, function (err, user) {
                if (err) return done(err);
                else if (!user) return done(null, false);
                else if (!(bcrypt.compareSync(password, user.password))) return done(null, false);
                return done(null, user);
            });
        }
    ));

    app.use(session({
        secret: "sdhfkuhksahdfkjsdghjnmbv",
        resave: false,
        saveUninitialized: false
    }));

    app.use(passport.initialize());
    app.use(passport.session());
}

module.exports = {init, passport};