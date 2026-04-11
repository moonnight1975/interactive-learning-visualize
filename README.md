# OS + AOA Interactive Learning Platform

An interactive teaching project that combines Operating Systems concepts with Analysis of Algorithms in one visual web app.

The repository now ships as a two-part platform:

- `os-lab/` — the Next.js frontend and NGILP user experience
- `backend/` — the FastAPI simulation engine, comparison APIs, and WebSocket streams

Together they let students explore:

- Physics-aware disk scheduling with `FCFS`, `SSTF`, and `SCAN`
- HDD vs SSD vs NVMe storage benchmarking
- Rotational latency, throughput, and page fault penalties in one timing model
- String matching with `Naive` and `KMP`
- Real file-backed simulations using uploaded text and log files
- Step-by-step playback, algorithm comparison, charts, and terminal-style logs

## Screenshots

### Landing Page

![Landing page](docs/screenshots/landing-page.png)

### OS Mode Comparison View

![OS mode comparison view](docs/screenshots/os-mode-comparison.png)

## Modes

### Combined Mode

Route: `/combined`

The main showcase mode that joins disk scheduling and pattern matching together.

- Runs disk head movement and content analysis in the same simulation
- Supports single-run mode and `FCFS vs SSTF` comparison mode
- Works with synthetic data or uploaded files mapped into simulated disk blocks
- Displays seek distance, comparisons, matches, hit counts, and live logs

### OS Mode

Route: `/os`

Focused only on disk scheduling.

- Simulates `FCFS`, `SSTF`, and `SCAN`
- Visualizes queue order, seek path, spinning platter timing, and total seek time
- Profiles algorithm deltas on the active workload
- Benchmarks the same workload across HDD, SSD, and NVMe
- Supports manual track input and file-backed tracks

### AOA Mode

Route: `/aoa`

Focused only on string matching.

- Runs `Naive`, `KMP`, or side-by-side comparison
- Highlights matches inside the input text
- Displays comparisons, matches, execution time, and the KMP `LPS` table

## Key Features

- FastAPI + WebSocket simulation backend for streamed execution
- Interactive visualizations for disk movement, platter rotation, and request processing
- Deterministic file-to-disk block mapping for repeatable demos
- Multi-pattern watchlists with case-sensitive and whole-word search options
- Log signal extraction for keywords like `error`, `warning`, `timeout`, and `denied`
- Performance dashboards with seek time, rotational delay, throughput, and page fault metrics
- Optimization profiler for algorithm ranking and storage-class benchmarking
- Mobile-friendly responsive UI

## Tech Stack

- FastAPI
- Python AsyncIO
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- GSAP
- Chart.js with `react-chartjs-2`
- Lucide React
- WebSockets

## Repository Structure

```text
os+aoa/
├── attack_log.txt        # Sample file for demos
├── backend/              # FastAPI simulation and comparison engine
├── os-lab/               # Next.js application
│   ├── src/app/          # App Router pages
│   ├── src/components/   # Visual and control components
│   ├── src/lib/          # Simulation and file parsing logic
│   └── package.json
└── test/                 # Helper/test scripts
```

## Getting Started

### Prerequisites

- Node.js 20+ recommended
- npm
- Python 3.11+ recommended

### Install and Run

```bash
cd backend
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000
```

In a second terminal:

```bash
cd os-lab
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production Build

```bash
cd os-lab
npm run build
npm start
```

Backend production-style run:

```bash
cd backend
python3 main.py
```

## Available Scripts

Inside `os-lab/`:

- `npm run dev` - start the development server
- `npm run build` - create a production build with Webpack
- `npm start` - start the production server
- `npm run lint` - run the lint script

Inside `backend/`:

- `python3 main.py` - run the FastAPI app directly
- `python3 -m uvicorn main:app --host 127.0.0.1 --port 8000` - run the backend with uvicorn

## How File-Backed Simulation Works

When a user uploads a file:

1. The file is read on the client side.
2. The content is split into blocks.
3. Each block is assigned a deterministic simulated track number.
4. Keywords and log signals are extracted.
5. The simulator uses those real blocks instead of generated synthetic content.

This makes the project useful for demos involving logs, traces, or real text files instead of only hardcoded examples.

## Sample Input

The repo includes `attack_log.txt`, which can be uploaded in the app to test file-backed analysis and watchlist detection.

## Notes

- Main routes are `/`, `/combined`, `/os`, and `/aoa`
- The UI is designed for both desktop and mobile screens
- File parsing and block analysis live in `os-lab/src/lib/fileParser.ts`
