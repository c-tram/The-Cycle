import express from 'express';
import { Builder, By, until } from 'selenium-webdriver';

const app = express();
const port = process.env.PORT || 3000;

app.get('/api/roster', async (req, res) => {
  let driver;
  try {
    const chrome: any = (await import('selenium-webdriver/chrome.js'));
    const chromePath = '/usr/bin/chromium';
    const chromeDriverPath = '/usr/bin/chromedriver';
    const options = new chrome.Options()
      .addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage')
      .setChromeBinaryPath(chromePath);
    const service = new chrome.ServiceBuilder(chromeDriverPath);
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .setChromeService(service)
      .build();
    // Example: Navigate to a baseball stats page (replace with real URL)
    await driver.get('https://www.espn.com/mlb/team/roster/_/name/nyy');
    // Example: Scrape player names and stats (update selectors as needed)
    const players = await driver.findElements(By.css('table tbody tr'));
    const data: Array<{ name: string; position: string }> = [];
    for (const player of players) {
      const name = await player.findElement(By.css('td:nth-child(2) a')).getText();
      const position = await player.findElement(By.css('td:nth-child(3)')).getText();
      data.push({ name, position });
    }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  } finally {
    if (driver) await driver.quit();
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
