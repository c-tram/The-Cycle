import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

interface TeamStanding {
  team: string;
  wins: number;
  losses: number;
  pct: string;
  gb: string;
  last10?: string;
  streak?: string;
}

interface DivisionStanding {
  division: string;
  teams: TeamStanding[];
}

// Mock data for fallback
export const MOCK_STANDINGS: DivisionStanding[] = [
  {
    division: 'American League East',
    teams: [
      { team: 'New York Yankees', wins: 92, losses: 70, pct: '.568', gb: '-', last10: '7-3', streak: 'W4' },
      { team: 'Baltimore Orioles', wins: 89, losses: 73, pct: '.549', gb: '3.0', last10: '5-5', streak: 'W1' },
      { team: 'Boston Red Sox', wins: 87, losses: 75, pct: '.537', gb: '5.0', last10: '6-4', streak: 'L1' },
      { team: 'Toronto Blue Jays', wins: 85, losses: 77, pct: '.525', gb: '7.0', last10: '4-6', streak: 'L2' },
      { team: 'Tampa Bay Rays', wins: 80, losses: 82, pct: '.494', gb: '12.0', last10: '5-5', streak: 'W2' }
    ]
  },
  {
    division: 'American League Central',
    teams: [
      { team: 'Cleveland Guardians', wins: 95, losses: 67, pct: '.586', gb: '-', last10: '6-4', streak: 'W2' },
      { team: 'Minnesota Twins', wins: 87, losses: 75, pct: '.537', gb: '8.0', last10: '5-5', streak: 'L1' },
      { team: 'Kansas City Royals', wins: 76, losses: 86, pct: '.469', gb: '19.0', last10: '4-6', streak: 'W1' },
      { team: 'Detroit Tigers', wins: 75, losses: 87, pct: '.463', gb: '20.0', last10: '5-5', streak: 'L3' },
      { team: 'Chicago White Sox', wins: 65, losses: 97, pct: '.401', gb: '30.0', last10: '3-7', streak: 'L5' }
    ]
  },
  {
    division: 'American League West',
    teams: [
      { team: 'Houston Astros', wins: 90, losses: 72, pct: '.556', gb: '-', last10: '7-3', streak: 'W3' },
      { team: 'Seattle Mariners', wins: 88, losses: 74, pct: '.543', gb: '2.0', last10: '6-4', streak: 'W2' },
      { team: 'Texas Rangers', wins: 86, losses: 76, pct: '.531', gb: '4.0', last10: '5-5', streak: 'L1' },
      { team: 'Los Angeles Angels', wins: 73, losses: 89, pct: '.451', gb: '17.0', last10: '3-7', streak: 'L4' },
      { team: 'Oakland Athletics', wins: 66, losses: 96, pct: '.407', gb: '24.0', last10: '4-6', streak: 'L2' }
    ]
  },
  {
    division: 'National League East',
    teams: [
      { team: 'Atlanta Braves', wins: 96, losses: 66, pct: '.593', gb: '-', last10: '8-2', streak: 'W4' },
      { team: 'Philadelphia Phillies', wins: 90, losses: 72, pct: '.556', gb: '6.0', last10: '6-4', streak: 'W2' },
      { team: 'New York Mets', wins: 84, losses: 78, pct: '.519', gb: '12.0', last10: '5-5', streak: 'L1' },
      { team: 'Miami Marlins', wins: 71, losses: 91, pct: '.438', gb: '25.0', last10: '4-6', streak: 'W1' },
      { team: 'Washington Nationals', wins: 65, losses: 97, pct: '.401', gb: '31.0', last10: '3-7', streak: 'L6' }
    ]
  },
  {
    division: 'National League Central',
    teams: [
      { team: 'Milwaukee Brewers', wins: 93, losses: 69, pct: '.574', gb: '-', last10: '6-4', streak: 'W2' },
      { team: 'Chicago Cubs', wins: 83, losses: 79, pct: '.512', gb: '10.0', last10: '5-5', streak: 'L2' },
      { team: 'St. Louis Cardinals', wins: 81, losses: 81, pct: '.500', gb: '12.0', last10: '4-6', streak: 'L1' },
      { team: 'Cincinnati Reds', wins: 78, losses: 84, pct: '.481', gb: '15.0', last10: '5-5', streak: 'W2' },
      { team: 'Pittsburgh Pirates', wins: 74, losses: 88, pct: '.457', gb: '19.0', last10: '3-7', streak: 'L3' }
    ]
  },
  {
    division: 'National League West',
    teams: [
      { team: 'Los Angeles Dodgers', wins: 98, losses: 64, pct: '.605', gb: '-', last10: '7-3', streak: 'W5' },
      { team: 'San Diego Padres', wins: 89, losses: 73, pct: '.549', gb: '9.0', last10: '6-4', streak: 'W1' },
      { team: 'Arizona Diamondbacks', wins: 84, losses: 78, pct: '.519', gb: '14.0', last10: '5-5', streak: 'L2' },
      { team: 'San Francisco Giants', wins: 79, losses: 83, pct: '.488', gb: '19.0', last10: '4-6', streak: 'W1' },
      { team: 'Colorado Rockies', wins: 65, losses: 97, pct: '.401', gb: '33.0', last10: '2-8', streak: 'L7' }
    ]
  }
];

interface DivisionStanding {
  division: string;
  teams: TeamStanding[];
}

/**
 * Scrapes current MLB standings data using Selenium
 * @returns Promise containing division standings
 */
export async function scrapeStandings(): Promise<DivisionStanding[]> {
  let driver: WebDriver | null = null;
  try {
    console.log("Starting standings scraper...");
    // Set up headless Chrome for scraping
    const options = new chrome.Options();
    options.addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');
    
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    // Navigate to MLB standings page
    await driver.get('https://www.mlb.com/standings');
    console.log("Navigated to MLB standings page");
    
    // Wait for standings tables to load
    await driver.wait(until.elementsLocated(By.css('.standings-table')), 10000);
    
    // Find all division containers
    const standingsTables = await driver.findElements(By.css('.standings-table'));
    console.log(`Found ${standingsTables.length} division tables`);
    
    // If no tables found, fall back to mock data
    if (standingsTables.length === 0) {
      console.log("No division tables found, using mock data");
      return MOCK_STANDINGS;
    }
    
    const allDivisionStandings: DivisionStanding[] = [];

    // Process each division table
    for (const table of standingsTables) {
      try {
        // Get division name
        const divisionElement = await table.findElement(By.css('.standings-table-wrapper__headline'));
        const divisionName = await divisionElement.getText();
        
        // Find all team rows
        const teamRows = await table.findElements(By.css('tbody tr'));
        
        const divisionTeams: TeamStanding[] = [];
        
        // Process each team
        for (const row of teamRows) {
          try {
            const cells = await row.findElements(By.css('td'));
            
            // Get team name
            const teamNameEl = await cells[0].findElement(By.css('.standings-table-team__name a'));
            const teamName = await teamNameEl.getText();
            
            // Get W-L record and other stats
            const wins = parseInt(await cells[1].getText(), 10);
            const losses = parseInt(await cells[2].getText(), 10);
            const pct = await cells[3].getText();
            const gb = await cells[4].getText();
            
            let last10 = '';
            let streak = '';
            
            // Some standings tables include L10 and Streak
            if (cells.length > 7) {
              last10 = await cells[6].getText();
              streak = await cells[7].getText();
            }
            
            divisionTeams.push({
              team: teamName,
              wins,
              losses,
              pct,
              gb,
              ...(last10 ? { last10 } : {}),
              ...(streak ? { streak } : {})
            });
          } catch (rowError) {
            console.error('Error processing team row:', rowError);
            continue;
          }
        }
        
        if (divisionTeams.length > 0) {
          allDivisionStandings.push({
            division: divisionName,
            teams: divisionTeams
          });
        }
      } catch (tableError) {
        console.error('Error processing division table:', tableError);
        continue;
      }
    }
    
    // If no valid data was scraped, return mock data
    if (allDivisionStandings.length === 0) {
      console.log("No valid standings data scraped, using mock data");
      return MOCK_STANDINGS;
    }
    
    return allDivisionStandings;
    
  } catch (error) {
    console.error('Error scraping standings:', error);
    console.log("Returning mock standings data due to error");
    return MOCK_STANDINGS;
  } finally {
    if (driver) {
      try {
        await driver.quit();
      } catch (e) {
        console.error('Error closing WebDriver:', e);
      }
    }
  }
}
