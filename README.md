\# Movie Watchlist Manager



A full-stack web application for managing your personal movie watchlist. Add movies, track your viewing progress, rate watched movies, and discover what to watch next.



\## Features



\- Add, edit, and delete movies

\- Track movie status: To Watch, Watching, and Watched

\- Search movies by title

\- Filter movies by genre and status

\- Sort movies by priority and runtime

\- Rate movies after watching them

\- Get a Watch Next recommendation based on priority and runtime

\- View statistics, including watched runtime and average rating

\- Automatically generate unique movie IDs

\- Validate movie details, including release year and runtime

\- Store movie data in MongoDB Atlas



\## Tech Stack



\*\*Frontend\*\*

\- React

\- Vite

\- Axios

\- Lucide React



\*\*Backend\*\*

\- Node.js

\- Express.js

\- MongoDB Atlas

\- Mongoose



\## Project Structure



```text

movie-watchlist-manager/

├── backend/

│   ├── config/

│   ├── models/

│   ├── routes/

│   ├── .env.example

│   └── server.js

├── frontend/

│   └── src/

├── .gitignore

└── README.md

```



\## Prerequisites



\- Node.js and npm

\- A MongoDB Atlas account or another MongoDB connection

\- Git



\## Getting Started



\### 1. Clone the repository



```bash

git clone https://github.com/YOUR-USERNAME/movie-watchlist-manager.git

cd movie-watchlist-manager

```



Replace `YOUR-USERNAME` with your GitHub username.



\### 2. Set up the backend



```bash

cd backend

npm install

```



Create a `.env` file inside the `backend` directory using `.env.example` as a reference.



Configure your environment variables:



```env

PORT=5000

MONGODB\_URI=your\_mongodb\_connection\_string

```



Replace the placeholder with your MongoDB connection string. Never commit your `.env` file or expose your database credentials.



Start the backend:



```bash

npm run dev

```



\### 3. Set up the frontend



Open a second terminal at the project root and run:



```bash

cd frontend

npm install

npm run dev

```



Open the local URL displayed by Vite in your terminal, usually `http://localhost:5173`.



\## Environment Variables



| Variable | Description |

|---|---|

| `PORT` | Backend server port |

| `MONGODB\_URI` | MongoDB connection string |



\## License



This project is available for learning and personal portfolio use.



