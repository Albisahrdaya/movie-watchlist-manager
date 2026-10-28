
const express = require("express");
const mongoose = require("mongoose");
const Movie = require("../models/Movie");
const Counter = require("../models/Counter");

const router = express.Router();


const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((error) => {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A movie with this title and release year already exists.",
        data: null,
      });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: error.message,
        data: null,
      });
    }

    console.error(error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred.",
      data: null,
    });
  });

const sendError = (res, status, message) =>
  res.status(status).json({ success: false, message, data: null });

const transitions = {
  "To Watch": ["Watching", "Watched"],
  Watching: ["Watched", "To Watch"],
  Watched: [],
};

function validRating(value) {
  return Number.isInteger(value) && value >= 1 && value <= 10;
}

function handleError(error, res) {
  if (error.code === 11000) {
    return sendError(
      res,
      409,
      "A movie with this title and release year already exists."
    );
  }

  if (error.name === "ValidationError" || error.name === "CastError") {
    return sendError(res, 400, error.message);
  }

  console.error(error);
  return sendError(res, 500, "An unexpected server error occurred.");
}

// GET /api/movies
router.get("/", asyncHandler(async (req, res) => {
  const { status, genre, search } = req.query;
  const page = Number(req.query.page || 1);
  const limit = 6;

  if (!Number.isInteger(page) || page < 1) {
    return sendError(res, 400, "Page must be a positive integer.");
  }

  const filter = {};

  if (status) {
    if (!["To Watch", "Watching", "Watched"].includes(status)) {
      return sendError(res, 400, "Invalid status filter.");
    }
    filter.status = status;
  }

  if (genre) {
    if (!Movie.GENRES.includes(genre)) {
      return sendError(res, 400, "Invalid genre filter.");
    }
    filter.genre = genre;
  }

  if (search?.trim()) {
    filter.title = { $regex: search.trim(), $options: "i" };
  }

  const totalMovies = await Movie.countDocuments(filter);
  const totalPages = Math.ceil(totalMovies / limit);

  const movies = await Movie.aggregate([
    { $match: filter },
    {
      $addFields: {
        statusOrder: {
          $switch: {
            branches: [
              { case: { $eq: ["$status", "To Watch"] }, then: 0 },
              { case: { $eq: ["$status", "Watching"] }, then: 1 },
              { case: { $eq: ["$status", "Watched"] }, then: 2 },
            ],
            default: 3,
          },
        },
      },
    },
    {
      $sort: {
        statusOrder: 1,
        priority: -1,
        runtime: 1,
        createdAt: -1,
      },
    },
    { $skip: (page - 1) * limit },
    { $limit: limit },
    { $project: { statusOrder: 0, titleKey: 0, __v: 0 } },
  ]);

  res.json({
    success: true,
    message: "Movies retrieved successfully.",
    data: {
      movies,
      pagination: {
        currentPage: page,
        totalPages,
        totalMovies,
        limit,
      },
    },
  });
}));

// GET /api/movies/watch-next
router.get("/watch-next", asyncHandler(async (req, res) => {
  const movie = await Movie.findOne({ status: "To Watch" })
    .sort({ priority: -1, runtime: 1, createdAt: 1 })
    .select("-titleKey -__v");

  if (!movie) {
    return sendError(res, 404, "No movies are waiting to be watched.");
  }

  res.json({
    success: true,
    message: "Here is your next movie.",
    data: movie,
  });
}));

// GET /api/movies/stats
router.get("/stats", asyncHandler(async (req, res) => {
  const [statusCounts, watchedStats, genreStats] = await Promise.all([
    Movie.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Movie.aggregate([
      { $match: { status: "Watched" } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalRuntime: { $sum: "$runtime" },
          averageRating: { $avg: "$rating" },
        },
      },
    ]),
    Movie.aggregate([
      { $match: { status: "Watched" } },
      { $group: { _id: "$genre", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 1 },
    ]),
  ]);

  const counts = {
    "To Watch": 0,
    Watching: 0,
    Watched: 0,
  };

  statusCounts.forEach(({ _id, count }) => {
    counts[_id] = count;
  });

  const watched = watchedStats[0] || {
    count: 0,
    totalRuntime: 0,
    averageRating: null,
  };

  res.json({
    success: true,
    message: "Statistics retrieved successfully.",
    data: {
      totalMovies: Object.values(counts).reduce((a, b) => a + b, 0),
      statusCounts: counts,
      totalHoursWatched: Number((watched.totalRuntime / 60).toFixed(1)),
      averageRating:
        watched.averageRating == null
          ? null
          : Number(watched.averageRating.toFixed(1)),
      mostWatchedGenre: genreStats[0]?._id || null,
      mostWatchedGenreCount: genreStats[0]?.count || 0,
    },
  });
}));

// POST /api/movies
router.post("/", asyncHandler(async (req, res) => {
  const { title, genre, releaseYear, runtime, platform, priority } = req.body;
  const year = Number(releaseYear);
  const currentYear = new Date().getFullYear();

  if (!title?.trim()) {
    return sendError(res, 400, "Title is required.");
  }

  if (!Number.isInteger(year) || year < 1950 || year > currentYear) {
    return sendError(
      res, 400,
      `Release year must be between 1950 and ${currentYear}.`
    );
  }

  if (!Number.isInteger(Number(runtime)) ||
      Number(runtime) < 30 || Number(runtime) > 300) {
    return sendError(res, 400, "Runtime must be between 30 and 300 minutes.");
  }

  if (!Number.isInteger(Number(priority)) ||
      Number(priority) < 1 || Number(priority) > 5) {
    return sendError(res, 400, "Priority must be an integer from 1 to 5.");
  }

  // The client is never allowed to choose the code or initial status.
  const existing = await Movie.findOne({
    titleKey: title.trim().toLowerCase(),
    releaseYear: year,
  }).select("_id");

  if (existing) {
    return sendError(
      res, 409,
      "A movie with this title and release year already exists."
    );
  }

  const counter = await Counter.findOneAndUpdate(
    { _id: String(year) },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const code = `MV-${year}-${String(counter.sequence).padStart(3, "0")}`;

  const movie = await Movie.create({
    code,
    title: title.trim(),
    genre,
    releaseYear: year,
    runtime: Number(runtime),
    platform,
    priority: Number(priority),
    status: "To Watch",
  });

  res.status(201).json({
    success: true,
    message: "Movie added successfully.",
    data: movie,
  });
}));

// PATCH /api/movies/:id/status
router.patch("/:id/status", asyncHandler(async (req, res) => {
  const { status, rating } = req.body;

  if (!mongoose.isValidObjectId(req.params.id)) {
    return sendError(res, 400, "Invalid movie ID.");
  }

  if (!transitions.hasOwnProperty(status)) {
    return sendError(res, 400, "Invalid target status.");
  }

  const movie = await Movie.findById(req.params.id);
  if (!movie) return sendError(res, 404, "Movie not found.");

  if (!transitions[movie.status].includes(status)) {
    return sendError(
      res, 400,
      movie.status === "Watched"
        ? "Watched movies are final and cannot change status."
        : `Cannot change status from ${movie.status} to ${status}.`
    );
  }

  if (status === "Watched") {
    if (!validRating(rating)) {
      return sendError(res, 400, "A rating from 1 to 10 is required.");
    }
    movie.rating = rating;
    movie.watchedDate = new Date();
  } else if (rating !== undefined) {
    return sendError(res, 400, "Rating is allowed only when marking Watched.");
  }

  movie.status = status;
  await movie.save();

  res.json({
    success: true,
    message: "Movie status updated successfully.",
    data: movie,
  });
}));

// PATCH /api/movies/:id/rating
router.patch("/:id/rating", asyncHandler(async (req, res) => {
  const { rating } = req.body;

  if (!mongoose.isValidObjectId(req.params.id)) {
    return sendError(res, 400, "Invalid movie ID.");
  }

  if (!validRating(rating)) {
    return sendError(res, 400, "Rating must be a whole number from 1 to 10.");
  }

  const movie = await Movie.findById(req.params.id);
  if (!movie) return sendError(res, 404, "Movie not found.");

  if (movie.status !== "Watched") {
    return sendError(res, 400, "Only Watched movies can have a rating.");
  }

  movie.rating = rating;
  await movie.save();

  res.json({
    success: true,
    message: "Rating updated successfully.",
    data: movie,
  });
}));

// PUT /api/movies/:id
router.put("/:id", asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return sendError(res, 400, "Invalid movie ID.");
  }

  const movie = await Movie.findById(req.params.id);
  if (!movie) return sendError(res, 404, "Movie not found.");

  const allowed = ["title", "genre", "runtime", "platform", "priority"];

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      movie[key] = key === "title"
        ? String(req.body[key]).trim()
        : req.body[key];
    }
  }

  await movie.save();

  res.json({
    success: true,
    message: "Movie updated successfully.",
    data: movie,
  });
}));

// DELETE /api/movies/:id
router.delete("/:id", asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return sendError(res, 400, "Invalid movie ID.");
  }

  const movie = await Movie.findById(req.params.id);
  if (!movie) return sendError(res, 404, "Movie not found.");

  if (movie.status === "Watching") {
    return sendError(res, 400, "Movies currently being watched cannot be deleted.");
  }

  await movie.deleteOne();

  res.json({
    success: true,
    message: "Movie deleted successfully.",
    data: movie,
  });
}));

module.exports = router;
