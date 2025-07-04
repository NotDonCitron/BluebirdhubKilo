# Puppeteer MCP Server Setup

This document explains how to set up and use the Puppeteer MCP (Model Context Protocol) server with Claude Code.

## Overview

The Puppeteer MCP server provides browser automation capabilities to Claude Code, allowing you to:
- Navigate to web pages
- Take screenshots
- Click elements
- Type text into forms
- Execute JavaScript
- Wait for elements to load
- Manage multiple browser pages

## Setup Instructions

### 1. Ensure Dependencies are Installed

The required dependencies should already be installed, but if not:

```bash
npm install @modelcontextprotocol/sdk puppeteer
```

### 2. Build the MCP Server

```bash
npx tsc mcp-server/puppeteer-server.ts --target ES2020 --module ESNext --moduleResolution node --outDir mcp-server/dist --skipLibCheck
```

### 3. Configure Claude Desktop

You need to add the MCP server configuration to your Claude Desktop config file.

**For Windows/WSL:**
- Location: `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/.config/Claude/claude_desktop_config.json` (Linux/WSL)

**Configuration:**

For production (using compiled JS):
```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "node",
      "args": [
        "/mnt/c/Users/pasca/Desktop/abacushub/app/mcp-server/dist/puppeteer-server.js"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

For development (using TypeScript directly):
```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": [
        "tsx",
        "/mnt/c/Users/pasca/Desktop/abacushub/app/mcp-server/puppeteer-server.ts"
      ],
      "cwd": "/mnt/c/Users/pasca/Desktop/abacushub/app",
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

### 4. Restart Claude Desktop

After updating the configuration, restart Claude Desktop for the changes to take effect.

## Available Tools

### Navigation
- **puppeteer_navigate**: Navigate to a URL
- **puppeteer_new_page**: Create a new browser page
- **puppeteer_close_page**: Close a specific page

### Interaction
- **puppeteer_click**: Click an element by CSS selector
- **puppeteer_type**: Type text into an input element
- **puppeteer_wait_for_selector**: Wait for an element to appear

### Information Gathering
- **puppeteer_screenshot**: Take a screenshot (full page or viewport)
- **puppeteer_get_content**: Get the HTML content of the page
- **puppeteer_evaluate**: Execute JavaScript and get the result

## Usage Examples

### Basic Web Scraping
```
Please navigate to https://example.com and take a screenshot
```

### Form Automation
```
1. Navigate to a login page
2. Type credentials into the username and password fields
3. Click the submit button
4. Take a screenshot of the result
```

### Multi-page Workflow
```
1. Create a new page called "search"
2. Navigate to Google on that page
3. Search for something
4. Take screenshots of both pages
```

## Security Considerations

- The browser runs in headless mode for security
- Sandbox flags are disabled for compatibility in containerized environments
- Pages are automatically cleaned up when the server shuts down
- Each MCP session creates isolated browser instances

## Troubleshooting

### Common Issues

1. **Command not found**: Ensure the file paths in the configuration are absolute and correct
2. **Permission denied**: Make sure the compiled JavaScript file is executable
3. **Puppeteer launch failed**: This might happen in some restricted environments - check the browser installation

### Debugging

To debug MCP server issues:
1. Check Claude Desktop logs
2. Run the server manually to see error output:
   ```bash
   node mcp-server/dist/puppeteer-server.js
   ```
3. Verify the configuration file syntax is valid JSON

### Browser Dependencies

If Puppeteer fails to launch, you might need to install browser dependencies:

```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y \
    ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 \
    libdrm2 libgtk-3-0 libnspr4 libnss3 libx11-xcb1 libxcomposite1 \
    libxdamage1 libxrandr2 xdg-utils

# For WSL, you might also need:
sudo apt-get install -y libgbm1
```

## Configuration Files

- `claude_desktop_config.json`: Production configuration
- `claude_desktop_config.dev.json`: Development configuration  
- `mcp-server/package.json`: MCP server package configuration
- `mcp-server/puppeteer-server.ts`: Server implementation
- `mcp-server/dist/puppeteer-server.js`: Compiled server

## Next Steps

After setup, you can use Claude Code with Puppeteer for:
- Automated testing of your AbacusHub application
- Web scraping for data collection
- Screenshot generation for documentation
- Form automation for testing workflows
- Browser-based integration testing