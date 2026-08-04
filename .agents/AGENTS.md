# Workspace Rules & Preferences

## Browser Automation & Testing
- **Exclusive Tool**: Use **Puppeteer ONLY** for all browser automation, visual testing, E2E auditing, and MCP browser operations. (Playwright is completely removed).
- **Chrome Executable Path**: For all Puppeteer scripts and MCP browser tools, ALWAYS use **Chrome Dev**:
  `C:\Program Files\Google\Chrome Dev\Application\chrome.exe`
- When launching Puppeteer in Node.js scripts, pass:
  `executablePath: "C:\\Program Files\\Google\\Chrome Dev\\Application\\chrome.exe"`
