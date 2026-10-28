
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Film, Plus, Search, Clapperboard, Clock3, Star,
  Pencil, Trash2, ChevronLeft, ChevronRight,
  Play, RotateCw, X, TrendingUp, CalendarDays,
} from "lucide-react";
import "./App.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/movies`;
const GENRES = [
  "Action", "Comedy", "Drama", "Horror",
  "Sci-Fi", "Romance", "Thriller",
];
const PLATFORMS = [
  "Netflix", "Prime Video", "Hotstar", "Theatre", "Other",
];
const TRANSITIONS = {
  "To Watch": ["Watching", "Watched"],
  Watching: ["Watched", "To Watch"],
  Watched: [],
};

const emptyForm = {
  title: "", genre: "Action", releaseYear: new Date().getFullYear(),
  runtime: 120, platform: "Netflix", priority: 3,
};

function App() {
  const [movies, setMovies] = useState([]);
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalMovies, setTotalMovies] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [recommendation, setRecommendation] = useState(null);

  const loadMovies = useCallback(async () => {
    try {
      const { data } = await axios.get(API, {
        params: {
          page, status: statusFilter || undefined,
          genre: genreFilter || undefined,
          search: search.trim() || undefined,
        },
      });
      setMovies(data.data.movies);
      setTotalPages(data.data.pagination.totalPages);
      setTotalMovies(data.data.pagination.totalMovies);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load movies.");
    }
  }, [page, statusFilter, genreFilter, search]);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/stats`);
      setStats(data.data);
    } catch {
      setError("Could not load statistics.");
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadMovies(), loadStats()]);
  }, [loadMovies, loadStats]);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  function startAdd() {
    setEditing(null);
    setForm({ ...emptyForm, releaseYear: new Date().getFullYear() });
    setError("");
    setFormOpen(true);
  }

  function startEdit(movie) {
    setEditing(movie);
    setForm({
      title: movie.title,
      genre: movie.genre,
      releaseYear: movie.releaseYear,
      runtime: movie.runtime,
      platform: movie.platform,
      priority: movie.priority,
    });
    setError("");
    setFormOpen(true);
  }

  async function saveMovie(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    const year = Number(form.releaseYear);
    const runtime = Number(form.runtime);
    const priority = Number(form.priority);

    if (!form.title.trim()) return setError("Please enter a movie title.");
    if (!editing && (!Number.isInteger(year) ||
        year < 1950 || year > new Date().getFullYear())) {
      return setError("Release year must be between 1950 and the current year.");
    }
    if (!Number.isInteger(runtime) || runtime < 30 || runtime > 300) {
      return setError("Runtime must be between 30 and 300 minutes.");
    }
    if (!Number.isInteger(priority) || priority < 1 || priority > 5) {
      return setError("Priority must be from 1 to 5.");
    }

    setBusy(true);
    try {
      const payload = {
        title: form.title.trim(),
        genre: form.genre,
        runtime,
        platform: form.platform,
        priority,
      };

      if (editing) {
        await axios.put(`${API}/${editing._id}`, payload);
        setNotice("Movie updated successfully.");
      } else {
        await axios.post(API, { ...payload, releaseYear: year });
        setPage(1);
        setNotice("Movie added successfully.");
      }

      setFormOpen(false);
      setEditing(null);
      setRecommendation(null);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save movie.");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(movie, status) {
    let rating;
    if (status === "Watched") {
      const answer = window.prompt(
        `Rate "${movie.title}" from 1 to 10:`
      );
      if (answer === null) return;
      rating = Number(answer);
      if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
        setError("Rating must be a whole number from 1 to 10.");
        return;
      }
    }

    setError("");
    setNotice("");
    try {
      await axios.patch(`${API}/${movie._id}/status`, {
        status,
        ...(rating !== undefined ? { rating } : {}),
      });
      setNotice(`"${movie.title}" is now ${status}.`);
      setRecommendation(null);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Could not change status.");
    }
  }

  async function editRating(movie) {
    const answer = window.prompt(
      `Enter a new rating for "${movie.title}" (1–10):`,
      String(movie.rating ?? 8)
    );
    if (answer === null) return;

    const rating = Number(answer);
    if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
      setError("Rating must be a whole number from 1 to 10.");
      return;
    }

    try {
      await axios.patch(`${API}/${movie._id}/rating`, { rating });
      setNotice("Rating updated.");
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update rating.");
    }
  }

  async function deleteMovie(movie) {
    if (movie.status === "Watching") return;
    if (!window.confirm(`Delete "${movie.title}" permanently?`)) return;

    setError("");
    setNotice("");
    try {
      await axios.delete(`${API}/${movie._id}`);
      setNotice("Movie deleted successfully.");
      setRecommendation(null);
      if (movies.length === 1 && page > 1) setPage(page - 1);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete movie.");
    }
  }

  async function watchNext() {
    setError("");
    setNotice("");
    try {
      const { data } = await axios.get(`${API}/watch-next`);
      setRecommendation(data.data);
    } catch (err) {
      setRecommendation(null);
      setError(err.response?.data?.message || "Could not find your next movie.");
    }
  }

  function updateFilter(setter, value) {
    setter(value);
    setPage(1);
    setRecommendation(null);
  }

  const watchedCount = stats?.statusCounts?.Watched ?? 0;
  const watchingCount = stats?.statusCounts?.Watching ?? 0;
  const todoCount = stats?.statusCounts?.["To Watch"] ?? 0;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home">
          <span className="brand-icon"><Film size={23} /></span>
          <span>Reel<span className="brand-accent">List</span></span>
        </a>
        <div className="side-label">WORKSPACE</div>
        <a className="nav-link active" href="#home">
          <Clapperboard size={18} /> My watchlist
        </a>
        <a className="nav-link" href="#statistics">
          <TrendingUp size={18} /> Statistics
        </a>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Film size={21} />
            <strong>Your next great story awaits.</strong>
            <span>One movie at a time.</span>
          </div>
          <span className="sidebar-footer">REEL LIST · MOVIE MANAGER</span>
        </div>
      </aside>

      <main className="main-content" id="home">
        <header className="topbar">
          <div>
            <div className="eyebrow">YOUR PERSONAL CINEMA</div>
            <h1>My watchlist<span className="heading-dot">.</span></h1>
            <p className="muted">Every great movie deserves a spot.</p>
          </div>
          <button className="primary-button" onClick={startAdd}>
            <Plus size={18} /> Add movie
          </button>
        </header>

        {error && (
          <div className="alert error-alert" role="alert">
            <span>{error}</span>
            <button className="icon-button" onClick={() => setError("")}>
              <X size={17} />
            </button>
          </div>
        )}
        {notice && (
          <div className="alert success-alert" role="status">
            <span>{notice}</span>
            <button className="icon-button" onClick={() => setNotice("")}>
              <X size={17} />
            </button>
          </div>
        )}

        <section className="stats-grid" id="statistics">
          <StatCard icon={<Clapperboard />} label="TOTAL MOVIES"
            value={stats?.totalMovies ?? "—"} detail="In your collection" />
          <StatCard icon={<Clock3 />} label="TO WATCH"
            value={todoCount} detail="Waiting for movie night" />
          <StatCard icon={<Play />} label="WATCHING"
            value={watchingCount} detail="Currently in progress" />
          <StatCard icon={<Star />} label="WATCHED"
            value={watchedCount} detail="Stories experienced" />
        </section>

        <section className="insight-grid">
          <div className="insight-card">
            <div className="insight-icon"><Clock3 size={20} /></div>
            <div>
              <span className="insight-label">TIME WELL SPENT</span>
              <strong>{stats ? `${stats.totalHoursWatched} hrs` : "—"}</strong>
              <span className="muted small">Total runtime watched</span>
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-icon star-icon"><Star size={20} /></div>
            <div>
              <span className="insight-label">YOUR AVERAGE RATING</span>
              <strong>{stats?.averageRating ?? "—"} <span className="out-of">/ 10</span></strong>
              <span className="muted small">Across watched movies</span>
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-icon genre-icon"><TrendingUp size={20} /></div>
            <div>
              <span className="insight-label">TOP GENRE</span>
              <strong className="genre-value">{stats?.mostWatchedGenre || "—"}</strong>
              <span className="muted small">
                {stats?.mostWatchedGenreCount
                  ? `${stats.mostWatchedGenreCount} watched`
                  : "No watched movies yet"}
              </span>
            </div>
          </div>
        </section>

        <section className="watch-next-panel">
          <div className="next-icon"><Clapperboard size={25} /></div>
          <div className="next-copy">
            <span className="eyebrow">CAN'T DECIDE?</span>
            <h2>What should I watch next?</h2>
            <p>Let your priority list pick tonight's movie.</p>
            {recommendation && (
              <div className="recommendation">
                <strong>{recommendation.title}</strong>
                <span>{recommendation.genre} · {recommendation.runtime} min · Priority {recommendation.priority}/5</span>
                <span className="muted small">{recommendation.code}</span>
              </div>
            )}
          </div>
          <button className="secondary-button" onClick={watchNext}>
            <Play size={16} fill="currentColor" /> Pick for me
          </button>
        </section>

        <section className="library-section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">THE COLLECTION</div>
              <h2>Your movies <span className="count-pill">{totalMovies}</span></h2>
            </div>
            <button className="icon-button refresh-button"
              title="Refresh movies and statistics" onClick={refresh}>
              <RotateCw size={18} />
            </button>
          </div>

          <div className="filters">
            <label className="search-box">
              <Search size={18} />
              <input
                placeholder="Search movie titles..."
                value={search}
                onChange={(e) => updateFilter(setSearch, e.target.value)}
              />
              {search && (
                <button className="icon-button" onClick={() => updateFilter(setSearch, "")}>
                  <X size={15} />
                </button>
              )}
            </label>
            <select value={statusFilter}
              onChange={(e) => updateFilter(setStatusFilter, e.target.value)}>
              <option value="">All statuses</option>
              <option>To Watch</option>
              <option>Watching</option>
              <option>Watched</option>
            </select>
            <select value={genreFilter}
              onChange={(e) => updateFilter(setGenreFilter, e.target.value)}>
              <option value="">All genres</option>
              {GENRES.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>

          {movies.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Film size={30} /></div>
              <h3>No movies found</h3>
              <p>Add a movie or adjust your search and filters.</p>
              <button className="primary-button" onClick={startAdd}>
                <Plus size={17} /> Add your first movie
              </button>
            </div>
          ) : (
            <div className="movie-grid">
              {movies.map((movie) => (
                <article className="movie-card" key={movie._id}>
                  <div className={`poster poster-${movie.genre.toLowerCase().replace(/[^a-z]/g, "")}`}>
                    <div className="poster-art"><Film size={38} /></div>
                    <span className="poster-code">{movie.code}</span>
                    <span className={`status-badge status-${movie.status.toLowerCase().replace(" ", "-")}`}>
                      {movie.status}
                    </span>
                  </div>
                  <div className="movie-info">
                    <div className="movie-title-row">
                      <h3 title={movie.title}>{movie.title}</h3>
                      <span className="priority" title={`Priority ${movie.priority}/5`}>
                        <Star size={13} fill="currentColor" /> {movie.priority}
                      </span>
                    </div>
                    <div className="movie-meta">
                      <span>{movie.genre}</span><span className="meta-dot">·</span>
                      <span>{movie.releaseYear}</span><span className="meta-dot">·</span>
                      <span>{movie.runtime} min</span>
                    </div>
                    <div className="platform-line">
                      <CalendarDays size={14} /> {movie.platform}
                    </div>
                    {movie.status === "Watched" && (
                      <button className="rating-line" onClick={() => editRating(movie)}>
                        <Star size={15} fill="currentColor" />
                        <strong>{movie.rating}/10</strong>
                        <span>Edit rating</span>
                      </button>
                    )}
                    <div className="card-actions">
                      <label className="status-select-label">
                        <span>STATUS</span>
                        <select
                          aria-label={`Change status for ${movie.title}`}
                          value={movie.status}
                          disabled={movie.status === "Watched"}
                          onChange={(e) => changeStatus(movie, e.target.value)}
                        >
                          <option value={movie.status}>{movie.status}</option>
                          {TRANSITIONS[movie.status].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                      <div className="action-buttons">
                        <button className="icon-button edit-button"
                          title="Edit movie" onClick={() => startEdit(movie)}>
                          <Pencil size={16} />
                        </button>
                        <button className="icon-button delete-button"
                          title={movie.status === "Watching" ? "Cannot delete a movie being watched" : "Delete movie"}
                          disabled={movie.status === "Watching"}
                          onClick={() => deleteMovie(movie)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="pagination">
            <span>Page {page} of {Math.max(totalPages, 1)}</span>
            <div className="pagination-actions">
              <button className="secondary-button page-button"
                disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft size={17} /> Previous
              </button>
              <button className="secondary-button page-button"
                disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </section>

        <footer className="app-footer">
          <span><Film size={15} /> ReelList</span>
          <span>Made for the love of movies.</span>
        </footer>
      </main>

      {formOpen && (
        <div className="modal-backdrop" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setFormOpen(false);
        }}>
          <section className="movie-modal" role="dialog" aria-modal="true"
            aria-labelledby="form-title">
            <div className="modal-heading">
              <div>
                <div className="eyebrow">{editing ? "UPDATE YOUR COLLECTION" : "GROW YOUR COLLECTION"}</div>
                <h2 id="form-title">{editing ? "Edit movie" : "Add a movie"}</h2>
                <p className="muted">Fill in the details below.</p>
              </div>
              <button className="icon-button" onClick={() => setFormOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="movie-form" onSubmit={saveMovie}>
              <label className="form-field full-field">
                <span>Movie title *</span>
                <input maxLength={150} required placeholder="e.g. Interstellar"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </label>
              <label className="form-field">
                <span>Genre *</span>
                <select required value={form.genre}
                  onChange={(e) => setForm({ ...form, genre: e.target.value })}>
                  {GENRES.map((g) => <option key={g}>{g}</option>)}
                </select>
              </label>
              <label className="form-field">
                <span>Release year *</span>
                <input type="number" required min="1950"
                  max={new Date().getFullYear()} disabled={!!editing}
                  value={form.releaseYear}
                  onChange={(e) => setForm({ ...form, releaseYear: e.target.value })} />
                {editing && <small>Release year cannot be changed.</small>}
              </label>
              <label className="form-field">
                <span>Runtime (minutes) *</span>
                <input type="number" required min="30" max="300"
                  value={form.runtime}
                  onChange={(e) => setForm({ ...form, runtime: e.target.value })} />
              </label>
              <label className="form-field">
                <span>Platform *</span>
                <select required value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                  {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </label>
              <label className="form-field full-field">
                <span>Priority: {form.priority}/5</span>
                <div className="priority-picker">
                  {[1, 2, 3, 4, 5].map((p) => (
                    <button key={p} type="button"
                      className={`priority-option ${Number(form.priority) >= p ? "selected" : ""}`}
                      aria-label={`Priority ${p}`}
                      onClick={() => setForm({ ...form, priority: p })}>
                      <Star size={19} fill={Number(form.priority) >= p ? "currentColor" : "none"} />
                    </button>
                  ))}
                  <span className="muted small">
                    {Number(form.priority) === 5 ? "Must watch!" :
                      Number(form.priority) >= 3 ? "On the list" : "Whenever"}
                  </span>
                </div>
              </label>

              {error && <div className="form-error full-field">{error}</div>}
              <div className="modal-actions full-field">
                <button type="button" className="secondary-button"
                  onClick={() => setFormOpen(false)}>Cancel</button>
                <button className="primary-button" disabled={busy}>
                  {busy ? "Saving..." : <><Plus size={17} /> {editing ? "Save changes" : "Add movie"}</>}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, detail }) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <strong className="stat-value">{value}</strong>
      <span className="stat-detail">{detail}</span>
    </article>
  );
}

export default App;
