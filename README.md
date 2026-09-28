# Eagle Manpower Lookahead

A 12-week rolling staffing/lookahead planning board for Eagle Controls, built with React + Vite and Firebase (Firestore + Auth + Hosting).

## Features

- Manpower board (People / Projects / Heatmap views) with drag-and-drop day assignment
- PM demand planning with per-role coverage gaps
- Ops Intelligence forecast, project health scoring, and a scenario-modeling lab
- Heuristic AI Planner for single-day rebalancing suggestions
- Attention Center (staffing alerts), Reports (CSV/JSON export, crew messaging), and Admin (roster/jobs/overhead/staffing roles)

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Firebase project's web config
npm run dev
```

## Testing

```bash
npm test
```

## Deploying

```bash
npm run build
firebase deploy --only hosting
```
