import { Builder, By, until } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome.js';

(async function runSeleniumTest() {
  let driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(new chrome.Options().addArguments('--headless', '--no-sandbox', '--disable-gpu'))
    .build();
  try {
    await driver.get('http://localhost:5173'); // Adjust port if needed
    // Example: check page title
    const title = await driver.getTitle();
    console.log('Page title:', title);
    // Example: check for a React element
    await driver.wait(until.elementLocated(By.css('div')), 5000);
    console.log('Found a div element on the page.');
    // Add more Selenium tests here
    process.exit(0);
  } catch (err) {
    console.error('Selenium test failed:', err);
    process.exit(1);
  } finally {
    await driver.quit();
  }
})();
