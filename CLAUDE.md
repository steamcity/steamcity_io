# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a new repository named "steamcity_io" that currently contains only a minimal README.md file. The repository appears to be in its initial state with no source code, configuration files, or build setup yet implemented.

## Current State

- **Repository Status**: Full-stack application (Backend API + Frontend SPA)
- **Backend Stack**: Node.js with Express.js framework
- **Frontend Stack**: Vanilla JavaScript ES6 modules with modular architecture
- **Build System**: package.json configured with npm scripts
- **Source Code**: Complete REST API + Interactive map-based frontend
- **Testing**: Vitest framework with E2E tests (98% pass rate)

## Development Setup

The project is now set up as a Node.js Express API with the following structure:

### Prerequisites
- Node.js >= 18.0.0
- npm package manager

### Commands
- `npm install` - Install dependencies
- `npm run dev` - Start development server with auto-reload (requires nodemon)
- `npm start` - Start production server (default port: 8080)
- `npm run lint` - Run ESLint for code quality
- `npm run format` - Format code with Prettier
- `npm test` - Run all tests with Vitest
- `npm run test:unit` - Run unit tests only
- `npm run test:e2e` - Run E2E tests only

### API Endpoints
- Health check: GET /api/health  
- Sensor data: GET/POST /api/sensors
- Experiments: GET/POST /api/experiments
- CSV upload: POST /api/sensors/upload-csv

## Architecture

### Backend (Node.js/Express)
- **Models**: Data validation with Joi schemas
- **Controllers**: Request handling and business logic
- **Routes**: API endpoint definitions
- **Storage**: JSON file-based storage (data/ directory)
- **Upload**: File handling with multer for CSV imports

### Frontend (Vanilla JS ES6 Modules)
- **Entry Point**: `public/js/main.js` - Initializes the App
- **App Core**: `public/js/app.js` - Main orchestrator, coordinates all managers
- **Managers** (Modular architecture):
  - `AuthManager` - Authentication and user session management
  - `ApiService` - HTTP client for backend API calls
  - `MapManager` - Leaflet map initialization and marker management
  - `DataVisualizationManager` - Chart.js visualizations and statistics
  - `ExperimentsManager` - Experiment data handling and display
  - `SensorsManager` - Sensor data management and filtering
  - `ViewManager` - DOM view switching and navigation
  - `RouterManager` - Hash-based routing and URL parameter handling

### Key Features
- **Interactive Map**: Leaflet-based map with experiment markers and protocol filtering
- **Data Visualization**: Chart.js graphs with time period selection (24h, 7d, 30d, 90d, all)
- **Routing**: Client-side hash routing with URL parameters
- **Authentication**: Token-based auth with local storage
- **Real-time Filtering**: Sensor data filtering by type, quality, date range