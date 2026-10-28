
const mongoose = require("mongoose");

const GENRES = [
  "Action", "Comedy", "Drama", "Horror",
  "Sci-Fi", "Romance", "Thriller",
];

const PLATFORMS = [
  "Netflix", "Prime Video", "Hotstar",
  "Theatre", "Other",
];

const STATUSES = ["To Watch", "Watching", "Watched"];

const movieSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      immutable: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    titleKey: {
      type: String,
      required: true,
      select: false,
    },
    genre: {
      type: String,
      required: true,
      enum: GENRES,
    },
    
releaseYear: {
  type: Number,
  required: true,
  min: [1950, "Release year must be at least 1950"],
  validate: {
    validator: function (value) {
      return Number.isInteger(value) &&
        value <= new Date().getFullYear();
    },
    message: function () {
      return `Release year must be between 1950 and ${new Date().getFullYear()}.`;
    },
  },
  immutable: true,
},
    runtime: {
      type: Number,
      required: true,
      min: 30,
      max: 300,
    },
    platform: {
      type: String,
      required: true,
      enum: PLATFORMS,
    },
    priority: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: "Priority must be an integer from 1 to 5",
      },
    },
    status: {
      type: String,
      enum: STATUSES,
      default: "To Watch",
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 10,
      validate: {
        validator: Number.isInteger,
        message: "Rating must be a whole number from 1 to 10",
      },
    },
    watchedDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent duplicates even if the title's letter case differs.
movieSchema.index(
  { titleKey: 1, releaseYear: 1 },
  { unique: true, name: "unique_title_release_year" }
);

movieSchema.pre("validate", function () {
  if (this.title) {
    this.titleKey = this.title.trim().toLowerCase();
  }

  if (this.status !== "Watched" && this.rating != null) {
    this.invalidate("rating", "Rating is allowed only for Watched movies");
  }

  if (this.status === "Watched" && this.rating == null) {
    this.invalidate("rating", "Rating is required for Watched movies");
  }
});

module.exports = mongoose.model("Movie", movieSchema);
module.exports.GENRES = GENRES;
module.exports.PLATFORMS = PLATFORMS;
module.exports.STATUSES = STATUSES;
