require('dotenv').config();
const fs = require('fs').promises;

// Utility for rate limiting
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runPerformanceScraper() {
  try {
    console.log('Starting execution: Reading data.json...');
    
    // 1. Read the initial JSON file
    const rawData = await fs.readFile('./data.json', 'utf8');
    const leads = JSON.parse(rawData);
    
    console.log(`Successfully loaded ${leads.length} records.`);
    const scoredData = [];

    // 2. Set up the processing loop
    for (const lead of leads) {
      const targetUrl = lead.url;
      
      if (!targetUrl) {
        console.warn('Warning: Missing URL for a record, skipping...');
        scoredData.push({ ...lead, mobileScore: 'Error' });
        continue;
      }
      
      console.log(`Fetching PageSpeed metrics for: ${targetUrl}`);
      try {
        // Construct the API URL targeting mobile strategy
        const apiKey = process.env.PAGESPEED_API_KEY;
        let apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&strategy=mobile`;
        if (apiKey) apiUrl += `&key=${apiKey}`;

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP Status ${response.status}`);
        
        const jsonResponse = await response.json();
        
        // Extract performance category score and convert (0 to 1) float to (0 to 100) integer
        const rawScore = jsonResponse.lighthouseResult?.categories?.performance?.score;
        const mobileScore = rawScore != null ? Math.round(rawScore * 100) : 'Error';

        scoredData.push({
          ...lead,
          mobileScore
        });

      } catch (error) {
        // Basic error assignment (to be fully refined in Phase 3)
        scoredData.push({ ...lead, mobileScore: 'Error' });
      }

      // Strict 2500ms rate limit delay between API calls
      await delay(2500);
    }

    // 3. Write dummy output
    await fs.writeFile('./scoredData.json', JSON.stringify(scoredData, null, 2));
    console.log('Phase 1 Complete: Successfully wrote dummy output to scoredData.json.');

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('Error: data.json not found in the root directory.');
    } else {
      console.error('Phase 1 Error:', error.message);
    }
  }
}

// Execute the script
runPerformanceScraper();
