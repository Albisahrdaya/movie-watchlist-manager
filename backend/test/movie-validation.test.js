
const test = require("node:test");
const assert = require("node:assert/strict");
const Movie = require("../models/Movie");

function validMovie(overrides = {}) {
  return new Movie({
    code: "MV-2025-001",
    title: "Interstellar",
    genre: "Sci-Fi",
    releaseYear: 2025,
    runtime: 169,
    platform: "Netflix",
    priority: 3,
    status: "To Watch",
    ...overrides,
  });
}

test("accepts a valid movie", async () => {
  const movie = validMovie();
  await assert.doesNotReject(() => movie.validate());
});

test("rejects an unsupported genre", async () => {
  const movie = validMovie({ genre: "Documentary" });

  await assert.rejects(
    () => movie.validate(),
    (error) => error.errors.genre != null
  );
});

test("rejects runtime below 30 minutes", async () => {
  const movie = validMovie({ runtime: 20 });

  await assert.rejects(
    () => movie.validate(),
    (error) => error.errors.runtime != null
  );
});

test("rejects runtime above 300 minutes", async () => {
  const movie = validMovie({ runtime: 301 });

  await assert.rejects(
    () => movie.validate(),
    (error) => error.errors.runtime != null
  );
});

test("rejects priority outside the 1–5 range", async () => {
  const movie = validMovie({ priority: 6 });

  await assert.rejects(
    () => movie.validate(),
    (error) => error.errors.priority != null
  );
});

test("rejects a rating when the movie is not watched", async () => {
  const movie = validMovie({ rating: 8 });

  await assert.rejects(
    () => movie.validate(),
    (error) => error.errors.rating != null
  );
});

test("requires a rating when the movie is watched", async () => {
  const movie = validMovie({ status: "Watched" });

  await assert.rejects(
    () => movie.validate(),
    (error) => error.errors.rating != null
  );
});

test("accepts a watched movie with a valid rating", async () => {
  const movie = validMovie({
    status: "Watched",
    rating: 8,
  });

  await assert.doesNotReject(() => movie.validate());
});

test("normalizes the title key for duplicate detection", async () => {
  const movie = validMovie({ title: "  INTERSTELLAR  " });

  await movie.validate();

  assert.equal(movie.titleKey, "interstellar");
});
