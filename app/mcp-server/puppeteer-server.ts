#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import puppeteer, { Browser, Page } from 'puppeteer';

class PuppeteerMCPServer {
  private server: Server;
  private browser: Browser | null = null;
  private pages: Map<string, Page> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'puppeteer-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'puppeteer_navigate',
          description: 'Navigate to a URL in a browser page',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'The URL to navigate to',
              },
              pageId: {
                type: 'string',
                description: 'Optional page ID (default: "main")',
                default: 'main',
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'puppeteer_screenshot',
          description: 'Take a screenshot of the current page',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: {
                type: 'string',
                description: 'Page ID (default: "main")',
                default: 'main',
              },
              fullPage: {
                type: 'boolean',
                description: 'Capture full page (default: false)',
                default: false,
              },
            },
          },
        },
        {
          name: 'puppeteer_click',
          description: 'Click an element on the page',
          inputSchema: {
            type: 'object',
            properties: {
              selector: {
                type: 'string',
                description: 'CSS selector for the element to click',
              },
              pageId: {
                type: 'string',
                description: 'Page ID (default: "main")',
                default: 'main',
              },
            },
            required: ['selector'],
          },
        },
        {
          name: 'puppeteer_type',
          description: 'Type text into an input element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: {
                type: 'string',
                description: 'CSS selector for the input element',
              },
              text: {
                type: 'string',
                description: 'Text to type',
              },
              pageId: {
                type: 'string',
                description: 'Page ID (default: "main")',
                default: 'main',
              },
            },
            required: ['selector', 'text'],
          },
        },
        {
          name: 'puppeteer_evaluate',
          description: 'Execute JavaScript in the browser context',
          inputSchema: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'JavaScript code to execute',
              },
              pageId: {
                type: 'string',
                description: 'Page ID (default: "main")',
                default: 'main',
              },
            },
            required: ['code'],
          },
        },
        {
          name: 'puppeteer_wait_for_selector',
          description: 'Wait for an element to appear on the page',
          inputSchema: {
            type: 'object',
            properties: {
              selector: {
                type: 'string',
                description: 'CSS selector to wait for',
              },
              timeout: {
                type: 'number',
                description: 'Timeout in milliseconds (default: 30000)',
                default: 30000,
              },
              pageId: {
                type: 'string',
                description: 'Page ID (default: "main")',
                default: 'main',
              },
            },
            required: ['selector'],
          },
        },
        {
          name: 'puppeteer_get_content',
          description: 'Get the HTML content of the page',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: {
                type: 'string',
                description: 'Page ID (default: "main")',
                default: 'main',
              },
            },
          },
        },
        {
          name: 'puppeteer_new_page',
          description: 'Create a new browser page',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: {
                type: 'string',
                description: 'Unique ID for the new page',
              },
            },
            required: ['pageId'],
          },
        },
        {
          name: 'puppeteer_close_page',
          description: 'Close a specific browser page',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: {
                type: 'string',
                description: 'Page ID to close',
              },
            },
            required: ['pageId'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        await this.ensureBrowser();

        if (!args) {
          throw new Error('No arguments provided');
        }

        switch (name) {
          case 'puppeteer_navigate':
            return await this.navigate(args.url as string, (args.pageId as string) || 'main');
          
          case 'puppeteer_screenshot':
            return await this.screenshot((args.pageId as string) || 'main', (args.fullPage as boolean) || false);
          
          case 'puppeteer_click':
            return await this.click(args.selector as string, (args.pageId as string) || 'main');
          
          case 'puppeteer_type':
            return await this.type(args.selector as string, args.text as string, (args.pageId as string) || 'main');
          
          case 'puppeteer_evaluate':
            return await this.evaluate(args.code as string, (args.pageId as string) || 'main');
          
          case 'puppeteer_wait_for_selector':
            return await this.waitForSelector(args.selector as string, (args.timeout as number) || 30000, (args.pageId as string) || 'main');
          
          case 'puppeteer_get_content':
            return await this.getContent((args.pageId as string) || 'main');
          
          case 'puppeteer_new_page':
            return await this.newPage(args.pageId as string);
          
          case 'puppeteer_close_page':
            return await this.closePage(args.pageId as string);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  private async ensureBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
  }

  private async getPage(pageId: string): Promise<Page> {
    if (!this.pages.has(pageId)) {
      await this.ensureBrowser();
      const page = await this.browser!.newPage();
      this.pages.set(pageId, page);
    }
    return this.pages.get(pageId)!;
  }

  private async navigate(url: string, pageId: string) {
    const page = await this.getPage(pageId);
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully navigated to ${url}`,
        },
      ],
    };
  }

  private async screenshot(pageId: string, fullPage: boolean) {
    const page = await this.getPage(pageId);
    const screenshot = await page.screenshot({ 
      encoding: 'base64',
      fullPage: fullPage,
    });
    
    return {
      content: [
        {
          type: 'image',
          data: screenshot,
          mimeType: 'image/png',
        },
      ],
    };
  }

  private async click(selector: string, pageId: string) {
    const page = await this.getPage(pageId);
    await page.click(selector);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully clicked element with selector: ${selector}`,
        },
      ],
    };
  }

  private async type(selector: string, text: string, pageId: string) {
    const page = await this.getPage(pageId);
    await page.type(selector, text);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully typed "${text}" into element with selector: ${selector}`,
        },
      ],
    };
  }

  private async evaluate(code: string, pageId: string) {
    const page = await this.getPage(pageId);
    const result = await page.evaluate(code);
    
    return {
      content: [
        {
          type: 'text',
          text: `Result: ${JSON.stringify(result)}`,
        },
      ],
    };
  }

  private async waitForSelector(selector: string, timeout: number, pageId: string) {
    const page = await this.getPage(pageId);
    await page.waitForSelector(selector, { timeout });
    
    return {
      content: [
        {
          type: 'text',
          text: `Element with selector "${selector}" appeared on the page`,
        },
      ],
    };
  }

  private async getContent(pageId: string) {
    const page = await this.getPage(pageId);
    const content = await page.content();
    
    return {
      content: [
        {
          type: 'text',
          text: content,
        },
      ],
    };
  }

  private async newPage(pageId: string) {
    if (this.pages.has(pageId)) {
      throw new Error(`Page with ID "${pageId}" already exists`);
    }
    
    await this.ensureBrowser();
    const page = await this.browser!.newPage();
    this.pages.set(pageId, page);
    
    return {
      content: [
        {
          type: 'text',
          text: `Created new page with ID: ${pageId}`,
        },
      ],
    };
  }

  private async closePage(pageId: string) {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page with ID "${pageId}" not found`);
    }
    
    await page.close();
    this.pages.delete(pageId);
    
    return {
      content: [
        {
          type: 'text',
          text: `Closed page with ID: ${pageId}`,
        },
      ],
    };
  }

  private async cleanup() {
    for (const [pageId, page] of this.pages) {
      try {
        await page.close();
      } catch (error) {
        console.error(`Error closing page ${pageId}:`, error);
      }
    }
    this.pages.clear();

    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        console.error('Error closing browser:', error);
      }
      this.browser = null;
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Puppeteer MCP server running on stdio');
  }
}

const server = new PuppeteerMCPServer();
server.run().catch(console.error);