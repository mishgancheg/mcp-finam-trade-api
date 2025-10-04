# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server for FINAM Trade API integration. The project implements:
1. A comprehensive API registry for all FINAM Trade API endpoints
2. An API emulator for development without real API access
3. An MCP server with tools wrapping all API endpoints
4. Testing infrastructure for both the API and MCP server

## Development Commands

```bash
# Build TypeScript to JavaScript
npm run build

# Clean build and rebuild
npm run cb

# Development mode with hot reload
npm run dev

# Linting
npm run lint          # Check for linting issues
npm run lint:fix      # Auto-fix linting issues

# Type checking
npm run typecheck     # Check TypeScript types without building

# Run MCP Server
npm run mcp           # stdio transport (for Claude Desktop)
npm run mcp:http      # HTTP/SSE transport

# Test MCP Server (all transports)
npm run test:mcp:http   # Test HTTP transport
npm run test:mcp:sse    # Test SSE transport
npm run test:mcp:stdio  # Test STDIO transport

# Run the compiled application
npm start
```

## Environment Configuration

Copy `.env.example` to `.env` and configure:
- `API_BASE_URL`: FINAM Trade API base URL (default: https://api.finam.ru/v1)
- `API_SECRET_TOKEN`: Your secret token from https://tradeapi.finam.ru/docs/tokens/
- `ACCOUNT_ID`: Your account ID without КлФ prefix
- `EMULATOR_PORT`: Port for the API emulator (default: 3000)
- `RETURN_AS`: MCP response format - `json` (structured data) or `string` (formatted text for LLM)
- `MCP_HTTP_PORT`: HTTP transport port (default: 3001)

## Project Architecture

### Directory Structure
- `src/` - Main source code
  - `api.ts` - API wrapper functions for all endpoints
  - `mcp/` - MCP server implementation
    - `server.ts` - MCP server core logic
    - `formatters.ts` - Response formatters (json/string modes)
    - `index.ts` - Entry point
  - `test/finam-trade-api-registry.js` - Structured metadata about FINAM Trade API endpoints
  - `lib/` - Utility libraries (JWT auth, utils)
  - `index.ts` - Main entry point
- `test/` - Testing infrastructure
  - `mcp/` - MCP transport tests (HTTP, SSE, STDIO)
    - `test-utils.js` - Shared test utilities
    - `http.js` - HTTP transport tester
    - `sse.js` - SSE transport tester
    - `stdio.js` - STDIO transport tester
  - HTTP test files (`.http`) for manual API endpoint testing
  - JavaScript test modules for automated testing
- `_fta/` - Source information about FINAM Trade API
  - `proto/` - Protocol buffer definitions
  - `api-registry-example.js` - Example structure for API endpoint registry
  - `descriptions.js` - API descriptions
  - `REST API.postman_collection.json` - Postman collection
- `_test-data/` - Test execution results stored as `<fullId>.md` files
- `prompts/` - Development plan and prompts for AI-assisted coding
- `dist/` - Compiled JavaScript output

### Key Implementation Components

#### 1. API Registry (`test/finam-trade-api-registry.js`)
Central registry containing all FINAM Trade API endpoints with:
- Full endpoint metadata (method, path, parameters)
- Request/response interfaces
- Validation rules
- Source documentation URIs
- Example responses

Structure follows the pattern in `_fta/api-registry-example.js` with properties:
- `fullId`: Unique identifier (e.g., "1-1" for group 1, test 1)
- `group`: API category (e.g., "Подключение", "Счета")
- `method`: HTTP method
- `endpoint`: API path with parameters
- `dataInterface`/`responseInterface`: TypeScript interface names
- `validation`: Response validation rules

#### 2. API Emulator
Implements all FINAM Trade API endpoints locally for development without real API access.
- Runs on configurable port from `.env`
- Simulates authentication flow with JWT tokens
- Returns realistic mock data matching API specifications

#### 3. MCP Server (`src/mcp/`)
Provides MCP tools wrapping all API endpoints with:
- **Transports**: HTTP/SSE and stdio
- **Authentication**:
  - stdio: Environment variables `API_SECRET_TOKEN` and `ACCOUNT_ID`
  - HTTP: Headers `Authorization: Bearer <token>` and `X-Finam-Account-Id: <id>`
- **Response Formatting**: Controlled by `RETURN_AS` environment variable
  - `json`: Structured data (default)
  - `string`: Formatted text optimized for LLM consumption
- **Special Handling**:
  - Assets (3-1): Removes `mic` property, limits to 1000 items (json) or 2000 (string as CSV)
  - LatestTrades (5-3): Limits to 100 records in both modes

##### MCP Server Usage

**stdio transport (for Claude Desktop):**
```bash
# Credentials from environment variables API_SECRET_TOKEN and ACCOUNT_ID
npm run mcp

# Or run directly
node dist/src/mcp/index.js
```

**HTTP transport (for HTTP-based MCP clients):**
```bash
# Default port 3001
npm run mcp:http

# Custom port
npm run mcp:http -- --port 3002

# Credentials passed in HTTP headers per request
curl http://localhost:3001/sse \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Finam-Account-Id: YOUR_ACCOUNT"
```

**Claude Desktop Configuration:**
```json
{
  "mcpServers": {
    "finam-trade-api": {
      "command": "node",
      "args": [
        "<path to project>/dist/src/mcp/index.js"
      ],
      "env": {
        "API_SECRET_TOKEN": "YOUR_SECRET_TOKEN",
        "ACCOUNT_ID": "YOUR_ACCOUNT_ID",
        "RETURN_AS": "string"
      }
    }
  }
}
```

#### 4. Testing Infrastructure

##### API Tester (`test/tester-api.js`, `test/tester-endpoints.js`)
Tests all real API endpoints:
- Handles JWT authentication flow
- Substitutes placeholders: `{secretToken}`, `{jwtToken}`, `{account_id}`, `{order_id}`, `{symbol}`
- Saves results to `_test-data/<fullId>.md`

##### MCP Transport Testers (`test/mcp/`)
Validates all MCP server tools and resources across all three transport protocols:

**HTTP Transport Tester** (`test/mcp/http.js`):
- Tests Streamable HTTP transport (POST /mcp/v1)
- Sends credentials via HTTP headers
- Saves results to `_test-data/mcp/http/`

**SSE Transport Tester** (`test/mcp/sse.js`):
- Tests Server-Sent Events transport (GET /sse, POST /message)
- Maintains persistent connection with event stream
- Sends credentials via HTTP headers
- Saves results to `_test-data/mcp/sse/`

**STDIO Transport Tester** (`test/mcp/stdio.js`):
- Tests standard input/output transport
- Spawns MCP server process with environment variables
- Communicates via stdin/stdout
- Saves results to `_test-data/mcp/stdio/`

**Common Features**:
- Tests all MCP tools with appropriate parameters
- Tests all MCP resources (enums and data resources)
- Reports success/failure statistics
- Saves detailed request/response logs in markdown format
- See `test/mcp/README.md` for detailed documentation

## Development Workflow

1. **Initial Setup**
   - Configure `.env` with your API credentials
   - Run `npm install` to install dependencies
   - Run `npm run build` to compile TypeScript

2. **API Development**
   - Update `test/finam-trade-api-registry.js` with new endpoints
   - Test endpoints using `.http` files in `test/` directory
   - Validate with the API tester

3. **MCP Server Development**
   - Implement tools in the MCP server for each API endpoint
   - Test locally with emulator (set `API_BASE_URL` to `http://localhost:3000`)
   - Validate with MCP transport tests or Claude Desktop

4. **MCP Testing Workflow**

   **For HTTP/SSE transports:**
   ```bash
   # Terminal 1: Start MCP server
   npm run mcp:http

   # Terminal 2: Run tests
   npm run test:mcp:http
   npm run test:mcp:sse
   ```

   **For STDIO transport:**
   ```bash
   # No server startup needed - test spawns its own process
   npm run test:mcp:stdio
   ```

   **Important Notes:**
   - Tests require valid credentials in `.env`
   - Test results saved to `_test-data/mcp/{transport}/`
   - **IMPORTANT**: Always stop emulator after testing: `node scripts kill-emulator.js`

## Utility Scripts

### Port Management
- `node scripts kill-port.js [port]` - Kill process on specified port
- `node scripts kill-emulator.js` - Stop emulator on port 3000 & 3006

**IMPORTANT FOR AI ASSISTANT**: When testing with the emulator, always stop it after completion using `node scripts kill-emulator.js`.

## TypeScript Configuration

The project uses strict TypeScript settings with:
- Target: ES2022
- Module system: ES modules
- Strict mode enabled with all strict checks
- Source maps and declarations generated
- JSON module resolution enabled

## Code Style

- No default exports (except `src/index.ts`)
- TypeScript strict mode enforced
- ESLint configured for TypeScript and JavaScript
- Imports must be explicit and typed

## Tool Usage Guidelines

### Reading Web Pages
When asked to view or analyze content from web pages (URLs), use the Playwright MCP tool instead of WebFetch. Playwright provides accurate, real-time rendering of dynamic content and can interact with the page elements.

Example:
- Use `mcp__playwright__browser_navigate` to open the page
- Use `mcp__playwright__browser_evaluate` to extract specific content
- Use `mcp__playwright__browser_snapshot` to understand page structure

This is especially important for documentation sites like https://tradeapi.finam.ru/docs/ which may have dynamic content loading.

## Implementation Priorities

Based on `prompts/plan.md`:
1. Complete API registry with all endpoints
2. Implement API tester with JWT authentication
3. Build API emulator for offline development
4. Create MCP server with all endpoint tools
5. Implement MCP tester for validation

Optional future enhancements:
6. AI pipeline with OpenAI integration
7. REST API server for chat interface
8. Web UI chat interface


## Demo-Agent Usage

### Development Mode
```bash
# Terminal 1: Start MCP server
npm run mcp:http

# Terminal 2: Start demo-agent in dev mode (hot reload)
cd demo-agent && npm run dev
# Access at: http://localhost:5173 (Vite dev server)
```

### Production Mode
```bash
# 1. Build the project
cd demo-agent && npm run build

# 2. Start production server
npm start
# Access at: http://localhost:3002 (single server for both UI and API)
```

**Production Features:**
- Single server on port 3002 serves both UI and API
- Static files served from `dist/ui/`
- API endpoints at `/api/*`
- SPA fallback for client-side routing
- Binds to `0.0.0.0` for network access


## FAQ

- Для генерации JWT-токена, с которым происходит обращение к методам API, необходим токен `secret_token`.

- secret_token генерируется на портале в рзделе "Токены" https://tradeapi.finam.ru/docs/tokens/.
  В проекте secret_token указывается в .env в переменной окружения API_SECRET_TOKEN

- JWT-токен живет 15 минут и генерируется методом API Auth (https://api.finam.ru/v1/sessions)
  подробнее о методе: https://tradeapi.finam.ru/docs/guides/rest/auth_service/Auth.

- В каждом методе. В заголовке Authorization ожидается JWT-токен.

- symbol передается в формате: YDEX@MISX (symbol@mic).

- Параметр `account_id`, это Ваш аккаунт (в личном кабинете он виден в формате `КлФ-account_id`.
  В API account_id указывать без КЛФ, только номерные символы.
  В проекте account_id указывается в .env в переменной окружения ACCOUNT_ID

- Метка времени timestamp в секундах, в формате Unix epoch, количество секунд с 1 января 1970. Конвертер для удобства.

- При использовании протокола HTTP версии 1 могут возникать ошибки вызова методов. Используйте протокол версии 2.

- Разрыв соединения при обращении к API через api.finam.ru, происходит 1 раз в день (86400s). С начала подписки, то есть открывается стрим и через день будет разрыв.
