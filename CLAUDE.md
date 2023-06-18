# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a new repository named "steamcity_io" that currently contains only a minimal README.md file. The repository appears to be in its initial state with no source code, configuration files, or build setup yet implemented.

## Current State

- **Repository Status**: Node.js API project initialized
- **Technology Stack**: Node.js with Express.js framework
- **Available Files**: Complete API structure with models, controllers, routes
- **Build System**: package.json configured with npm scripts
- **Source Code**: Full REST API implementation for sensor data sharing

## Development Setup

The project is now set up as a Node.js Express API with the following structure:

### Prerequisites
- Node.js >= 18.0.0
- npm package manager

### Commands
- `npm install` - Install dependencies
- `npm run dev` - Start development server with auto-reload (requires nodemon)  
- `npm start` - Start production server
- `npm run lint` - Run ESLint for code quality
- `npm run format` - Format code with Prettier
- `npm test` - Run tests with Jest

### API Endpoints
- Health check: GET /api/health  
- Sensor data: GET/POST /api/sensors
- Experiments: GET/POST /api/experiments
- CSV upload: POST /api/sensors/upload-csv

## Architecture

- **Models**: Data validation with Joi schemas
- **Controllers**: Request handling and business logic
- **Routes**: API endpoint definitions
- **Storage**: JSON file-based storage (data/ directory)
- **Upload**: File handling with multer for CSV imports