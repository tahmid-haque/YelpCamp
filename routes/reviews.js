const router = require('express').Router({mergeParams: true}),
    database = require("../middleware/database"),
    mongoID = require("mongodb").ObjectID,
    isUser = require("../middleware").isReviewOwner;

// NEW - Open form to create a new review
router.get("/new", async (req, res) => {
    if (!mongoID.isValid(req.params.campground)) req.failure(res, "Invalid ID");
    const campground = await req.db.collection('campgrounds')
        .findOne({_id: mongoID(req.params.campground)})
        .catch(err => req.failure(res, err));
        
    res.render("reviews/new", {campground})
});

// Create - Add the newly made review to the campground
router.post("/", async (req, res) => {
    await req.db.collection('reviews').insertOne({
        author: {
            username: req.user.username, 
            _id: req.user._id
        }, 
        lastModified: Date.now(),
        rating: req.body.rating,
        text: req.body.text
    }, (err, r) => {
        if (err || r.insertedCount !== 1) {
            req.failure(res, err);
        }
        if (!mongoID.isValid(req.params.campground)) req.failure(res, "Invalid ID");
        req.db.collection('campgrounds').updateOne({_id: mongoID(req.params.campground)}, {$push: {"reviews": r.insertedId}}, async (err, r) => {
            if (err || r.modifiedCount !== 1) {
                req.failure(res, err);
            }
            else {
                await updateRating(req, res, req.body.rating);
                req.flash('success', 'Your review was successfully added!');
                res.redirect(`/campgrounds/${req.params.campground}`);
            }
        });
    });
});

// EDIT - Open the review edit form
router.get("/:id/edit", isUser, async (req, res) => {

    if (!mongoID.isValid(req.params.campground)) req.failure(res, "Invalid ID");
    const campground = await req.db.collection('campgrounds')
        .findOne({_id: mongoID(req.params.campground)})
        .catch(err => req.failure(res, err));

    if (!campground) req.failure(res);

    if (req.isUser) {
        res.render("reviews/edit", {review: req.review, campground});
    } else verificationFailed(req, res);
});

// UPDATE - Update a review
router.put("/:id", isUser, async (req, res) => {
    if (req.isUser) {
        if (!mongoID.isValid(req.params.campground)) req.failure(res, "Invalid ID");

        const prev = await req.db.collection('reviews').findOneAndUpdate({_id: mongoID(req.params.id)}, {
            $set: {
                text: req.body.text, 
                lastModified: Date.now(), 
                rating: req.body.rating
            }
        }, 
        (err, r) => {
            if (err || r.ok !== 1) req.failure(res, err);
        });
    }
    else verificationFailed(req, res);

    await updateRating(req, res, req.body.rating, prev.value.rating);
    req.flash('success', 'Your review was successfully updated!');
    res.redirect(`/campgrounds/${req.params.campground}`);
});

// DESTROY - Remove a review
router.delete("/:id", isUser, async (req, res) => {
    if (req.isUser) {
        if (!mongoID.isValid(req.params.campground)) req.failure(res, "Invalid ID");
        if (!mongoID.isValid(req.params.id)) req.failure(res, "Invalid ID");

        let prev;
        await Promise.all([
            req.db.collection('reviews').findOneAndDelete({_id: mongoID(req.params.id)},
            (err, r) => {
                if (err || r.ok !== 1) req.failure(res, err);
                else prev = r.value;
            }),
            req.db.collection("campgrounds").updateOne(
                {_id: mongoID(req.params.campground)}, 
                {$pull: {reviews: mongoID(req.params.id)}},
                async (err, f) => {
                if (err || f.modifiedCount !== 1) req.failure(res, err);
                else {
                    await updateRating(req, res, 0, prev.rating);
                    req.flash('success', 'Your review was successfully removed.');
                    res.redirect(`/campgrounds/${req.params.campground}`);
                }
            })
        ]);
    } else verificationFailed(req, res);
});

function verificationFailed(req, res) {
    req.flash("error", "You do not have the necessary permissions to complete the action.");
    res.redirect(`/campgrounds/${req.params.campground}`);
}

async function updateRating(req, res, newRating, prevRating) {
    const campground = await req.db.collection('campgrounds')
        .findOne({_id: mongoID(req.params.campground)})
        .catch(err => req.failure(res, err));
    
    let averageRating;

    if (!prevRating) {
        averageRating = (Number(campground.averageRating) 
        * (campground.reviews.length - 1) + Number(newRating)) 
        / campground.reviews.length;
    }
    else if (newRating === 0) {
        averageRating = (Number(campground.averageRating) 
        * (campground.reviews.length + 1) - Number(prevRating)) 
        / campground.reviews.length;
    }
    else {
        averageRating = (Number(campground.averageRating) 
        * campground.reviews.length - Number(prevRating) 
        + Number(newRating)) / campground.reviews.length;
    }

    await req.db.collection('campgrounds').updateOne(
        {_id: mongoID(req.params.campground)}, 
        {$set: {averageRating}}, 
        (err, r) => { 
            if (err || r.modifiedCount !== 1) req.failure(res, err);
        });
}

module.exports = router;