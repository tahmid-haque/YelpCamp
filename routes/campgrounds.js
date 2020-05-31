const router = require('express').Router(),
    database = require("../middleware/database"),
    mongoID = require("mongodb").ObjectID,
    isLoggedIn = require("../middleware").isLoggedIn,
    isUser = require("../middleware").isCampgroundOwner;

// INDEX - Display a list of all campgrounds
router.get("/", async (req, res) => {
    const campgrounds = await req.db.collection('campgrounds').find().toArray()
        .catch(err => req.failure(res, err));

    await campgrounds.sort((a, b) => {
        if (Number(a.averageRating) > Number(b.averageRating)) return -1;
        else if (Number(b.averageRating) > Number(a.averageRating)) return 1;
        else return b.lastModified - a.lastModified;
    });
    res.render("campgrounds/index", {campgrounds});
});

// CREATE - Add new campground to DB
router.post("/", isLoggedIn, async (req, res) => {
    req.db.collection('campgrounds').insertOne({
        name: req.body.name, 
        image: req.body.URL, 
        price: req.body.price,
        lastModified: Date.now(),
        description: req.body.description,
        location: req.body.location.split(', '),
        reviews: [],
        averageRating: 0.0,
        author: {
            username: req.user.username, 
            _id: req.user._id
        }
    }, (err, r) => {
        if (err || r.insertedCount !== 1) req.failure(res, err);
        else {
            req.flash('success', 'Your campground was successfully added!');
            res.redirect("campgrounds");
        }
    });
});

// NEW - Display form to add new campground
router.get("/new", isLoggedIn, (req, res) => {
    res.render("campgrounds/new");
});

// SHOW - Shows info about one campground
router.get("/:id", isUser, async (req, res) => {
    if (!mongoID.isValid(req.params.id)) req.failure(res, "Invalid ID");

    const campground = (req.campground !== undefined) ? req.campground : 
    await req.db.collection('campgrounds')
        .findOne({_id: mongoID(req.params.id)})
        .catch(err => req.failure(res, err));
    
    if (!campground) req.failure(res);
    
    campground.reviews = await Promise.all(campground.reviews.map(id => {
            if (!mongoID.isValid(id)) req.failure(res, "Invalid ID");
            return req.db.collection('reviews').findOne({_id: mongoID(id)});
        }))
        .catch(err => {req.failure(res, err)});
    
    if (req.isAuthenticated()) {
        for (let i = 0; i < campground.reviews.length; i++) {
            campground.reviews[i].isUser = req.user._id.equals(
                campground.reviews[i].author._id);
        }
    }
    await campground.reviews.sort((a, b) => b.lastModified - a.lastModified);

    res.render("campgrounds/show", {campground, isUser: req.isUser});
});

// EDIT - Open the campground edit form
router.get("/:id/edit", isUser, async (req, res) => {
    if (req.isUser) {
        res.render("campgrounds/edit", {campground: req.campground});
    } else verificationFailed(req, res);
});

// UPDATE - Update a campground
router.put("/:id", isUser, async (req, res) => {
    if (req.isUser) {
        if (!mongoID.isValid(req.params.id)) req.failure(res, "Invalid ID");
        else req.db.collection('campgrounds').updateOne({_id: mongoID(req.params.id)}, {
            $set: {
                name: req.body.name, 
                image: req.body.URL, 
                lastModified: Date.now(),
                description: req.body.description,
                location: req.body.location.split(', '),
                price: req.body.price
            }
        }, 
        (err, r) => {
            if (err || r.modifiedCount !== 1) req.failure(res, err);
            else {
                req.flash('success', 'Your campground was successfully updated!');
                res.redirect(`/campgrounds/${req.params.id}`);
            }
        });
    } else verificationFailed(req, res);
});

// DESTROY - Remove a campground
router.delete("/:id", isUser, async (req, res) => {
    if (req.isUser) {
        if (!mongoID.isValid(req.params.id)) req.failure(res, "Invalid ID");
        else req.db.collection('campgrounds').findOneAndDelete({_id: mongoID(req.params.id)}, (err, r) => {
            if (err || r.ok !== 1) req.failure(res, err);
            else {
                req.db.collection("reviews").deleteMany({_id: {$in: r.value.reviews}}, (err, f) => {
                    if (err || f.deletedCount !== r.value.reviews.length) req.failure(res, err);
                    else {
                        req.flash('success', 'Your campground was successfully removed.');
                        res.redirect("/campgrounds");
                    }
                });
            }
        });
    } else verificationFailed(req, res);
});

function verificationFailed(req, res) {
    req.flash("error", "You do not have the necessary permissions to complete the action.");
    res.redirect(`/campgrounds/${req.params.id}`);
}

module.exports = router;