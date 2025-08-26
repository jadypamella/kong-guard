# KongGuard

A comprehensive sensitive data leak detection system with dashboard, API scanner, MCP server, and Kong Gateway plugin.

## Components

- **Dashboard**: React frontend for scanning text and viewing logs
- **API**: Node.js Express service that scans text for secrets
- **MCP Server**: TypeScript MCP server with scan_prompt tool
- **Kong Plugin**: Lua plugin that blocks AI requests containing secrets
- **Infrastructure**: Docker Compose setup for local development

## Quick Start

### Frontend Dashboard
The dashboard is already running in your development environment. It provides:
- Text scanning interface with team assignment
- Real-time logs with auto-refresh
- Settings for backend configuration and mock mode
- Multi-language support (English/Swedish)

### Backend Services

1. **Clone and test the API**:
```bash
cd api
npm install
npm test
```

2. **Run the full backend stack**:
```bash
cd infra
docker compose up -d
```

3. **Verify the setup**:
- Visit http://localhost:8080/logs to check API
- Test scanning: `POST http://localhost:8080/scan` with payload containing "password"

## Architecture

- **API Service**: Scans text using regex patterns, maintains in-memory logs
- **MCP Server**: Exposes scan functionality as MCP tool
- **Kong Plugin**: Intercepts requests, scans content, logs decisions
- **Dashboard**: User interface for manual scanning and monitoring

## Development

The dashboard connects to the backend API and will automatically detect when services are running. Switch off mock mode in Settings to connect to the real backend.

## Security Patterns Detected

- Password assignments
- JWT tokens  
- AWS access keys (AKIA...)
- AWS secrets (40-char base64)
- Private key blocks