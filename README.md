# 🌤️ WeatherWise

> **SaaS AI Weather Intelligence Platform** — Real-time weather data with a sleek, modern UI and a secure backend proxy.

![WeatherWise Banner](assets/logo.svg)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Running Locally](#running-locally)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Security](#security)
- [License](#license)

---

## 🌍 Overview

**WeatherWise** is a full-featured weather intelligence web application that delivers real-time weather conditions, forecasts, and AI-assisted insights through a beautifully designed interface. It uses a **secure Node.js backend proxy** to shield your API keys from client-side exposure.

---

## ✨ Features

- 🔍 **City Search** — Instant weather lookup by city name
- 🌡️ **Current Conditions** — Temperature, humidity, wind speed, UV index, and more
- 📅 **Multi-day Forecast** — Extended weather outlook
- 🗺️ **Dynamic Backgrounds** — Weather-responsive UI themes
- 🔐 **Secure API Proxy** — API keys are never exposed to the browser
- ⚡ **Zero-dependency Backend** — Pure native Node.js (`http`, `fs`, `path`)
- ☁️ **Netlify Ready** — Serverless function support via Netlify Functions

---

## 🛠️ Tech Stack

| Layer      | Technology                          |
|------------|--------------------------------------|
| Frontend   | HTML5, Vanilla CSS, JavaScript (ES6+)|
| Backend    | Node.js (native modules only)        |
| Weather API| OpenWeatherMap                       |
| Deployment | Netlify (Serverless Functions)       |

---

## 📁 Project Structure

```
WEATHER APP/
├── assets/
│   ├── favicon.svg          # App favicon
│   └── logo.svg             # WeatherWise logo
├── netlify/
│   └── functions/           # Netlify serverless functions
├── index.html               # Landing page
├── app.html                 # Main weather dashboard
├── landing.css              # Landing page styles
├── core.css                 # Shared/global styles
├── app.css                  # Dashboard styles
├── script.js                # Main application logic
├── server.js                # Node.js backend proxy server
├── netlify.toml             # Netlify deployment config
├── package.json             # Project metadata
├── .env.example             # Environment variable template
├── .gitignore               # Git ignore rules
└── README.md                # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher (for `process.loadEnvFile` support)
- A free [OpenWeatherMap API key](https://openweathermap.org/api)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/weather-app.git

# Navigate into the project
cd weather-app
```

### Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your credentials:
   ```env
   PORT=3000
   OPENWEATHER_API_KEY=your_actual_api_key_here
   ```

> ⚠️ **Never commit your `.env` file!** It is already included in `.gitignore`.

### Running Locally

```bash
node server.js
```

Then open your browser at: **http://localhost:3000**

---

## ☁️ Deployment

This project is configured for **Netlify** with serverless function support.

1. Push this repository to GitHub.
2. Connect your GitHub repo to [Netlify](https://netlify.com).
3. Add your environment variables in **Netlify → Site Settings → Environment Variables**:
   - `OPENWEATHER_API_KEY` = your API key
4. Netlify will auto-deploy on every push to `master`.

The `netlify.toml` file handles build settings and function routing automatically.

---

## 🔌 API Reference

The backend proxy exposes the following internal endpoints:

| Endpoint              | Method | Description                    |
|-----------------------|--------|--------------------------------|
| `/api/weather`        | GET    | Current weather by city name   |
| `/api/forecast`       | GET    | Multi-day forecast data        |

All external calls to OpenWeatherMap are made **server-side**, keeping your API key secure.

---

## 🔐 Security

- ✅ API keys are stored in `.env` and loaded server-side only
- ✅ `.env` is excluded from version control via `.gitignore`
- ✅ `.env.example` is provided for safe onboarding of collaborators
- ✅ No external npm dependencies — reduced attack surface

---

## 👨‍💻 Author

**Rajveer Dhiman**

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">Built with ❤️ by Rajveer Dhiman</p>
