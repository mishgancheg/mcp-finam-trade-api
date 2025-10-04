# FINAM Trade API MCP Server


<font size="5">
Выполнено в рамках хакатона `Finam AI Trade Hack`. 04.10.2025   
</font>

[Тестер для размещения результатов на leaderboard](demo-agent/test/README.md)

-----


MCP server providing 30+ trading tools for Claude AI and other MCP clients.

## 🚀 Quick Start

### For Users

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "finam": {
      "command": "npx",
      "args": ["-y", "mcp-finam-trade-api"],
      "env": {
        "API_SECRET_TOKEN": "your_token",
        "ACCOUNT_ID": "your_account_id",
        "RETURN_AS": "string"
      }
    }
  }
}
```

**Get Credentials:**

1. **API_SECRET_TOKEN**: https://tradeapi.finam.ru/docs/tokens/ → Generate token
2. **ACCOUNT_ID**: Personal account → Copy ID (digits only, without КЛФ-)

Restart Claude Desktop - done!

### For Developers

```bash
git clone https://github.com/mishgancheg/mcp-finam-trade-api.git
cd mcp-finam-trade-api
npm install
npm run build

# Create .env
RETURN_AS=json

# Run
npm run mcp          # STDIO
npm run mcp:http     # HTTP server
```

## 🔌 Connection Methods

### 1. Local STDIO (via npx)

```json
{
  "mcpServers": {
    "finam": {
      "command": "npx",
      "args": ["-y", "mcp-finam-trade-api"],
      "env": {
        "API_SECRET_TOKEN": "token",
        "ACCOUNT_ID": "123456"
      }
    }
  }
}
```

### 2. Remote Server (via mcp-remote)

```json
{
  "mcpServers": {
    "finam": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://your-server.com/sse",
        "--header", "Authorization:${FINAM_AUTH}",
        "--header", "X-Finam-Account-Id:${FINAM_ID}"
      ],
      "env": {
        "FINAM_AUTH": "Bearer <secret_token>",
        "FINAM_ID": "<account_id>"
      }
    }
  }
}
```

⚠️ No spaces around `:` (Windows Claude Desktop bug)

### 3. Local Node (development)

```json
{
  "mcpServers": {
    "finam": {
      "command": "node",
      "args": ["/path/to/dist/src/mcp/index.js"],
      "env": {
        "API_SECRET_TOKEN": "<secret_token>",
        "ACCOUNT_ID": "<account_id>"
      }
    }
  }
}
```

**Config Location:**

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Or: Settings → Developer → Edit Config

## 🛠️ Available Tools (19 total)

### Connection (2)

- `Auth` - Get JWT token
- `TokenDetails` - Token permissions

### Accounts (3)

- `GetAccount` - Account info
- `Trades` - Account trades
- `Transactions` - Transactions history

### Instruments (5)

- `Assets` - List assets
- `Clock` - Server time
- `GetAssetDetails` - Trading parameters
- `OptionsChain` - Options data
- `Schedule` - Trading schedule

### Orders (4)

- `PlaceOrder` - Create order
- `GetOrder` - Order details
- `GetOrders` - List orders
- `CancelOrder` - Cancel order

### Market Data (4)

- `Bars` - Historical candles
- `LastQuote` - Current quote
- `LatestTrades` - Recent trades
- `OrderBook` - Order book depth

### Search (1)

- `SearchInstruments` - Exact instrument lookup by symbol, isin, or ticker

## 📚 Available Resources

### Enums (13)

- `enum://OrderType` - Order types
- `enum://TimeInForce` - Time in force values
- `enum://OrderStatus` - Order statuses
- `enum://StopCondition` - Stop conditions
- `enum://QuoteLevel` - Quote levels
- `enum://AccountType` - Account types
- `enum://AccountStatus` - Account statuses
- `enum://AssetType` - Asset types
- `enum://OptionType` - Option types
- `enum://SessionType` - Session types
- `enum://TimeFrame` - Timeframes
- `enum://TransactionCategory` - Transaction categories
- `enum://OrderBookAction` - Order book actions

### Schemas (2)

- `schema://asset` - Complete asset/instrument field descriptions
- `schema://order` - Complete order information field descriptions

### Data (1)

- `exchange://list` - List of exchanges with mic codes (cached, updates every 2 hours)

## 💬 Available Prompts

### trading-agent

Introduces Claude as a trading agent for brokerage account operations.

**Parameters:**
- `account_id` (optional if default is configured) - Account ID to work with

**Usage:** Provides context for Claude to act as a trading assistant, helping with account operations, order management, and market analysis.

## 🔗 Links

- [FINAM Trade API](https://tradeapi.finam.ru/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [GitHub Repository](https://github.com/mishgancheg/mcp-finam-trade-api)
- [npm Package](https://www.npmjs.com/package/mcp-finam-trade-api)



## ⚠️ Disclaimer

<div style="color:#d00; font-size:1.25em; font-weight:600;">
This software is provided "as is" for educational purposes. Trading involves risk. Use at your own risk.
</div>
