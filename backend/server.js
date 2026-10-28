
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const movieRoutes = require("./routes/movieRoutes");

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Movie Watchlist API is running.",
    data: null,
  });
});

app.use("/api/movies", movieRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found.",
    data: null,
  });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(async () => {
    // Ensure the unique title/year index exists before accepting requests.
    const Movie = require("./models/Movie");
    await Movie.init();
    
    app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Movie Watchlist API is running",
  });
});
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  });
  