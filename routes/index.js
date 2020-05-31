const router = require('express').Router(),
    bcrypt = require('bcrypt'),
    database = require("../middleware/database"),
    passport = require("../middleware/passport").passport,
    campgroundRoutes = require("./campgrounds"),
    reviewRoutes = require("./reviews"),
    isLoggedIn = require("../middleware").isLoggedIn;

// SHOW - Display landing page
router.get("/", (req, res) => {
    res.render("landing");
});

// NEW - Show user registration form
router.get("/register", (req, res) => {
    res.render("register");
});

// CREATE - Create new user
router.post("/register", async (req, res) => {
    if (!req.body.username || !req.body.password) req.failure(res, "Blank username/password", "Please ensure both username and password are given.", '/register');
    req.db.collection('users').findOne({username: req.body.username})
    .then(async dupe => {
        if (dupe) {
            req.flash('error', 'The user already exists! Please use another username.')
            res.redirect("/register");
        }
        else {
            let user = {username: req.body.username};
            user.password = await bcrypt.hash(req.body.password, 10);
            
            req.db.collection('users').insertOne(user, (err, r) => {
                if (err || r.insertedCount !== 1) req.failure(res, err);
                passport.authenticate('local')(req, res, () => {
                    req.flash('success', `Welcome to Yelpcamp, ${user.username}`);
                    res.redirect('/campgrounds');
                });
            });
        }
    })
    .catch(err => req.failure(res, err));
});

// SHOW - Show login form
router.get("/login", (req, res) => {
    res.render("login");
});

// Log in the user
router.post("/login", passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: 'Invalid username or password'
}), (req, res) => {
    req.flash('success', `Welcome back, ${req.user.username}`);
    res.redirect('/campgrounds');
});

// Log out the user
router.get("/logout", (req, res) => {
    req.logout();
    req.flash("success", "Successfully logged out.")
    res.redirect("back");
});

// Aggregate all routes

router.use("/campgrounds", campgroundRoutes);
router.use("/campgrounds/:campground/reviews", isLoggedIn, reviewRoutes);

router.get("*", (req, res) => req.failure(res, "Invalid URL"));

module.exports = router;