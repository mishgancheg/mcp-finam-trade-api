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

# Run the compiled application
npm start
```

## Environment Configuration

Copy `.env.example` to `.env` and configure:
- `API_BASE_URL`: FINAM Trade API base URL (default: https://api.finam.ru/v1)
- `API_SECRET_TOKEN`: Your secret token from https://tradeapi.finam.ru/docs/tokens/
- `ACCOUNT_ID`: Your account ID without КлФ prefix
- `EMULATOR_PORT`: Port for the API emulator (default: 3000)

## Project Architecture

### Directory Structure
- `src/` - Main source code
  - `meta/` - Structured metadata about FINAM Trade API endpoints
  - `index.ts` - Entry point
- `test/` - Testing infrastructure
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

#### 1. API Registry (`src/meta/finam-trade-api-registry.js`)
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

#### 3. MCP Server
Provides tools for all API endpoints with:
- Support for HTTP, SSE, and stdio transports
- Authentication via secret token and account ID
- For stdio: CLI arguments for credentials
- For HTTP/SSE: HTTP headers (Authorization: Bearer, X-Finam-Account-Id)

#### 4. Testing Infrastructure
- **API Tester**: Tests all real API endpoints
  - Handles JWT authentication flow
  - Substitutes placeholders: `{secretToken}`, `{jwtToken}`, `{account_id}`, `{order_id}`, `{symbol}`
  - Saves results to `_test-data/<fullId>.md`
- **MCP Tester**: Validates all MCP server tools work correctly

## Development Workflow

1. **Initial Setup**
   - Configure `.env` with your API credentials
   - Run `npm install` to install dependencies
   - Run `npm run build` to compile TypeScript

2. **API Development**
   - Update `src/meta/finam-trade-api-registry.js` with new endpoints
   - Test endpoints using `.http` files in `test/` directory
   - Validate with the API tester

3. **MCP Server Development**
   - Implement tools in the MCP server for each API endpoint
   - Test locally with emulator (set `API_BASE_URL` to `http://localhost:3000`)
   - Validate with MCP tester or Claude Desktop

4. **Testing Workflow**
   - Start emulator: `node dist/emulator/index.js` (or use real API)
   - Start MCP server: `node dist/mcp/index.js`
   - Run MCP tester to validate all tools

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


## FAQ

- Для генерации JWT-токена, с которым происходит обращение к методам API, необходим токен `secret-token`.

- secret-token генерируется на портале в рзделе "Токены" https://tradeapi.finam.ru/docs/tokens/.
  В проекте secret-token указывается в .env в переменной окружения API_SECRET_TOKEN

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
