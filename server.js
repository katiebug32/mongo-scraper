var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoscraper";
mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

// Routes

// A GET route for scraping the echoJS website
  app.get("/scrape", function (req, res) {
    scrapeNow();
    res.send("Scrape Initiated");
  });

const scrapeNow = () => {
    // First, we grab the body of the html with axios
    axios.get("https://www.npr.org/sections/news/").then(function (response) {
      // Then, we load that into cheerio and save it to $ for a shorthand selector
      var $ = cheerio.load(response.data);
      // Now, we grab every h2 within an article tag, and do the following:
      $("article").each(function (i, element) {
        // Save an empty result object
        var result = {};

        result.title = $(element)
          .find("h2")
          .children("a")
          .text();
        result.link = $(element)
          .find("h2")
          .children("a")
          .attr("href");
        result.teaser = $(element)
          .find(".teaser")
          .text();
        result.photo = $(element)
          .find("img")
          .attr("src");

        console.log('trying to create article', result);
        if (!result.title || !result.link) {
          console.log('skipping bad article...');
          return;
        }
        // Create a new Article using the `result` object built from scraping
        // db.Article.create(result)
        let filter = {link: result.link}
        let options = {upsert: true}
        db.Article.findOneAndUpdate(filter, result, options)

          .then(function (dbArticle) {
            // View the added result in the console
            console.log(dbArticle);
          })
          .catch(function (err) {
            // If an error occurred, log it
            console.log('error during create call', err);
          });
      });
    });
  };

  // Route for getting all Articles from the db
  app.get("/articles", function (req, res) {
    // TODO: Finish the route so it grabs all of the articles
    db.Article.find({})
      .then(function (dbArticles) {
        // If any articles are found, send them to the client
        res.json(dbArticles);
      })
      .catch(function (err) {
        // If an error occurs, send it back to the client
        res.json(err);
      });
  });


// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
  // TODO
  // ====
  // Finish the route so it finds one article using the req.params.id,
  // and run the populate method with "note",
  // then responds with the article with the note included

  db.Article.findOne({
    _id: req.params.id
  })
    .populate("note")
    .then(function (dbArticle) {
      // find all notes associated with user
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurs, send it back to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {
  // TODO
  // ====
  // save the new note that gets posted to the Notes collection
  // then find an article from the req.params.id
  // and update it's "note" property with the _id of the new note

  db.Note.create(req.body)
    .then(function (dbNote) {
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function (dbArticle) {
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurs, send it back to the client
      res.json(err);
    });
});

// Route for getting all Articles from the db
app.get("/articles/delete", function (req, res) {
  db.Article.deleteMany({})
    .then(function (dbNews) {
      res.json(dbNews);
    })
    .catch(function (err) {
      res.json(err);
    });
  console.log("attempted to delete");
});

// Start the server
app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
  scrapeNow();
});
