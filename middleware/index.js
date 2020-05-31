const db = require("./database").getDB(),
    mongoID = require("mongodb").ObjectID;

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash("error", "Please Login to do that action.")
    res.redirect("/login");
}

async function isCampgroundOwner(req, res, next) {
    req.isUser = false;
    if (req.isAuthenticated()) {
        if (!mongoID.isValid(req.params.id)) req.failure(res, "Invalid ID");
        const campground = await db.collection('campgrounds')
        .findOne({_id: mongoID(req.params.id)})
        .catch(err => req.failure(res, err));
        if (!campground) req.failure(res);
        if (req.user._id.equals(campground.author._id)) {
            req.campground = campground;
            req.isUser = true;
        }
    }
    return next();
}

async function isReviewOwner(req, res, next) {
    req.isUser = false;
    if (!mongoID.isValid(req.params.id)) req.failure(res, "Invalid ID");
    const review = await db.collection('reviews')
        .findOne({_id: mongoID(req.params.id)})
        .catch(err => req.failure(res, err));
    if (!review) req.failure(res);
    if (req.user._id.equals(review.author._id)) {
        req.review = review;
        req.isUser = true;
    }
    return next();
}

function init(req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    res.locals.MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;
    req.failure = (res, err, message = 'Something went wrong... please try again.', redirect = '/') => {
        if (err) console.log(err);
        req.flash('error', message);
        res.redirect(redirect);
    };

    next();
}

module.exports = {isLoggedIn, isCampgroundOwner, isReviewOwner, init}