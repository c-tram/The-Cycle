"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const selenium_webdriver_1 = require("selenium-webdriver");
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.static('public'));
// Example: /api/roster?team=nyy
app.get('/api/roster', async (req, res) => {
    const team = req.query.team?.toLowerCase() || 'nyy';
    let driver;
    try {
        const chrome = require('selenium-webdriver/chrome');
        const chromePath = '/usr/bin/chromium';
        const chromeDriverPath = '/usr/bin/chromedriver';
        const options = new chrome.Options()
            .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage')
            .setChromeBinaryPath(chromePath);
        const service = new chrome.ServiceBuilder(chromeDriverPath);
        driver = await new selenium_webdriver_1.Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .setChromeService(service)
            .build();
        // Scrape the ESPN roster page for the given team
        const url = `https://www.espn.com/mlb/team/roster/_/name/${team}`;
        await driver.get(url);
        const players = await driver.findElements(selenium_webdriver_1.By.css('table tbody tr'));
        const data = [];
        for (const player of players) {
            const tds = await player.findElements(selenium_webdriver_1.By.css('td'));
            const name = await tds[1].getText();
            const position = await tds[2].getText();
            const stats = [];
            for (let i = 3; i < tds.length; i++) {
                stats.push(await tds[i].getText());
            }
            data.push({ name, position, stats });
        }
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
    finally {
        if (driver)
            await driver.quit();
    }
});
// Serve index.html for all non-API routes (for React Router support)
app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile('index.html', { root: __dirname + '/../public' });
});
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
