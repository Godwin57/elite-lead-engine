require('dotenv').config();
const fs = require('fs').promises;

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
      
      // Dummy output for Phase 1
      scoredData.push({
        ...lead,
        mobileScore: 'Pending'
      });
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
