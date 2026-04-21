# NomadTrack Client

NomadTrack Client is the React + Vite frontend for the NomadTrack travel social platform. It connects to the NomadTrack backend API for authentication, dashboard data, trips, wishlists, users, recommendations, likes, comments, and photo uploads.

This README is focused on getting the frontend running locally from scratch.

## What This Frontend Includes

- Account registration and login
- Protected pages for dashboard, trips, wishlists, users, and recommendations
- Trip photo uploads through backend-generated presigned URLs
- Optional AWS Lex + Bedrock chatbot support after login
- Production build output for S3/Jenkins deployment

## Tech Stack

- React 19
- Vite 7
- React Router 7
- AWS SDK integrations for Lex and Bedrock
- ESLint for linting

## Prerequisites

Before you start, make sure you have:

- Git
- Node.js 20 or newer
- npm
- Access to the NomadTrack backend API

For local development, the frontend expects the backend to be reachable at `http://localhost:8080` unless you point it somewhere else in your env file.

## Step-By-Step Local Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd client
```

If you already have the repo, open a terminal in the frontend root folder instead.

### 2. Install dependencies

```bash
npm install
```

This project uses `package-lock.json`, so `npm install` is the correct install command.

### 3. Create your local environment file

Use the example file as the starting point.

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

macOS/Linux:

```bash
cp .env.example .env.local
```

`.env.local` is the right place for local frontend settings and is already ignored by Git. For local work, prefer this file instead of editing `.env.production`.

### 4. Configure `.env.local`

Open `.env.local` and set the values you need.

Minimum local setup:

```env
VITE_API_URL=http://localhost:8080
VITE_AWS_REGION=us-east-1
VITE_AWS_LEX_BOT_ID=
VITE_AWS_LEX_BOT_ALIAS_ID=
VITE_AWS_LEX_LOCALE_ID=en_US
VITE_AWS_BEDROCK_AGENT_ID=
VITE_AWS_BEDROCK_AGENT_ALIAS_ID=
VITE_AWS_ACCESS_KEY_ID=
VITE_AWS_SECRET_ACCESS_KEY=
```

Important notes:

- `VITE_API_URL` is the main setting for the backend URL. In local development, the app falls back to `http://localhost:8080` if this value is missing.
- You can use `http://localhost:8080` or `http://localhost:8080/nomadTrack`. The frontend normalizes the value and will append `/nomadTrack` if it is missing.
- If you leave the AWS chatbot variables blank, the rest of the app still works. Only the chatbot will remain unconfigured.
- Vite exposes `VITE_*` variables to the browser. Do not place long-lived secrets in frontend env files for real production use.

### 5. Start the backend

Start the NomadTrack backend before launching the frontend.

The frontend expects the API to answer on:

```text
http://localhost:8080/nomadTrack
```

If your backend runs somewhere else, change `VITE_API_URL` in `.env.local` to match it.

If you do not want to run the backend locally, you can point `VITE_API_URL` to a deployed environment instead.

### 6. Start the frontend dev server

```bash
npm run dev
```

Vite will start the local dev server, usually at:

```text
http://localhost:5173
```

### 7. Open the app in your browser

Visit:

```text
http://localhost:5173
```

From there you can:

- Register a new account at `/register`
- Log in at `/login`
- Access Dashboard, Trips, Wishlists, Users, and Recommendations after authentication

### 8. Verify the setup

A successful setup usually looks like this:

- The landing page loads without build errors
- You can register or log in
- After login, protected pages stop redirecting you back to `/login`
- API-backed pages load data from the backend
- The `Chat` button appears after login, and it only works if the AWS chatbot env values are configured

## Environment Variables

The frontend currently recognizes these env values:

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | Recommended | Base URL for the backend API. In local dev, the app falls back to `http://localhost:8080` |
| `VITE_AWS_REGION` | No | AWS region for Lex and Bedrock |
| `VITE_AWS_LEX_BOT_ID` | No | Lex bot ID for chatbot support |
| `VITE_AWS_LEX_BOT_ALIAS_ID` | No | Lex bot alias ID |
| `VITE_AWS_LEX_LOCALE_ID` | No | Lex locale, usually `en_US` |
| `VITE_AWS_BEDROCK_AGENT_ID` | No | Bedrock agent ID |
| `VITE_AWS_BEDROCK_AGENT_ALIAS_ID` | No | Bedrock agent alias ID |
| `VITE_AWS_ACCESS_KEY_ID` | No | AWS access key used by the chatbot integration |
| `VITE_AWS_SECRET_ACCESS_KEY` | No | AWS secret key used by the chatbot integration |
| `REACT_APP_API_URL` | No | Legacy fallback for the API base URL |

## Available Scripts

- `npm run dev` starts the local Vite dev server
- `npm run build` creates the production build in `dist/`
- `npm run preview` previews the production build locally
- `npm run lint` runs ESLint

## Building For Production

Create the production build with:

```bash
npm run build
```

Then preview it locally with:

```bash
npm run preview
```

The generated frontend assets are written to `dist/`.

## Deployment Notes

- This frontend is intended to be deployed as static assets
- The existing project notes reference deployment to an AWS S3 bucket through Jenkins
- Make sure the production environment provides the correct API and AWS-related env values at build time

## Troubleshooting

### The app loads, but API requests fail

- Confirm the backend is running
- Confirm `VITE_API_URL` points at the right backend
- Restart `npm run dev` after changing env values

### I keep getting redirected to login

- Protected routes require a valid token in local storage
- Log in again and confirm the backend authentication flow is working

### The chatbot says it is not configured

- Add the Lex and Bedrock env values to `.env.local`
- Restart the dev server after changing env variables

### Photo uploads fail

- The frontend expects the backend upload endpoint to return a presigned upload URL
- Your backend and storage configuration must be working for trip photo uploads to succeed

### My env changes are not showing up

- Stop the Vite dev server
- Start it again with `npm run dev`

## Suggested First Test Flow

If you want a quick smoke test after setup, use this order:

1. Start the backend
2. Start the frontend
3. Open the landing page
4. Register a user
5. Log in
6. Open Trips and create or inspect a trip
7. Open Wishlists and add an item
8. Confirm protected pages load correctly
