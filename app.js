const express = require("express"),
    app = express(),
    methodOverride = require('method-override'),
    routes = require('./routes'),
    initAuthentication = require('./middleware/passport').init,
    flash = require('connect-flash'),
    moment = require('moment'),
    dbConnected = require('./middleware/database').checkDbConnection;
    middleware = require("./middleware").init;

// Initialization
app.set("view engine", "ejs");
app.use(express.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));

// Aunthentication
initAuthentication(app);

// Other Middleware
app.use(flash());
app.locals.moment = moment;
app.use(middleware);

// Database
app.use(dbConnected);

// Routes
app.use(routes);

// Server
app.listen(process.env.PORT || 3000, () => console.log("YelpCamp Server started on port 3000..."));