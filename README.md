# Radio Calipso

A web-based internet radio player for the [SomaFM Groove Salad](https://somafm.com/groovesalad/) channel, with live now-playing info, album art, and per-track thumbs up/down ratings.

![Screenshot](Screenshot3.png)

## Features

- HLS live stream playback (via hls.js, with native fallback for Safari)
- Now-playing display: artist, track, album, album art (fetched from iTunes)
- Live listener count and genre info
- Previous tracks list with timestamps
- Thumbs up / thumbs down rating for any track (stored per anonymous user token)
- Volume control
- User management page

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** SQLite via better-sqlite3
- **Frontend:** Vanilla JS, HTML, CSS
- **Stream:** HLS via [hls.js](https://github.com/video-dev/hls.js)
- **Metadata API:** [SomaFM API](https://somafm.com/channels.json)
- **Album art:** iTunes Search API

## Getting Started

### Prerequisites

- Node.js 18+

### Install & Run

```bash
git clone https://github.com/VolodymyrPanchenko/radio-calipso.git
cd radio-calipso
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

For development with auto-reload:

```bash
npm run dev
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ratings?songs=key1\|key2&token=xxx` | Get ratings for song keys |
| POST | `/api/ratings` | Submit or toggle a rating (`song_key`, `token`, `rating: 1\|-1`) |
| GET | `/api/users` | List users |
| POST | `/api/users` | Create a user (`name`, `email`) |

## Project Structure

```
radio-calipso/
├── public/
│   ├── index.html      # Main player page
│   ├── app.js          # Frontend logic
│   ├── style.css       # Styles
│   └── users.html      # User management page
├── src/
│   ├── db/
│   │   └── database.js # SQLite setup
│   └── routes/
│       └── index.js    # API routes
└── server.js           # Express server
```

## License

ISC
