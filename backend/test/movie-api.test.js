
const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../server");

test("movie API integration test database starts safely", async (t) => {
  let mongoServer;
  let httpServer;

  try {
    mongoServer = await MongoMemoryServer.create();

    // Connect only to the temporary test database.
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "movie_watchlist_test",
    });

    httpServer = app.listen(0);

    await new Promise((resolve, reject) => {
      httpServer.once("listening", resolve);
      httpServer.once("error", reject);
    });

    const address = httpServer.address();

    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/movies`
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.deepEqual(body.data.movies, []);
    assert.equal(body.data.pagination.totalMovies, 0);

    t.diagnostic("Temporary MongoDB integration test passed.");
  } finally {
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    if (mongoServer) {
      await mongoServer.stop();
    }
  }
});
