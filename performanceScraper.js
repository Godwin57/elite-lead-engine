require("dotenv").config();
const fs = require("fs").promises;

// Utility for rate limiting
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runPerformanceScraper() {
  try {
    console.log("Starting execution: Reading data.json...");

    // 1. Read the initial JSON file
    const rawData = await fs.readFile("./data.json", "utf8");
    const leads = JSON.parse(rawData);

    console.log(`Successfully loaded ${leads.length} records.`);
    const scoredData = [];
    let successCount = 0;
    let errorCount = 0;

    // 2. Set up the processing loop
    for (const lead of leads) {
      // Dynamically check for multiple common Apify URL keys
      const targetUrl =
        lead.website || lead.url || lead.websiteUrl || lead.domain;

      if (!targetUrl) {
        console.warn(
          `⚠️ Warning: Record missing URL (index ${scoredData.length}). Skipping fetch...`,
        );
        scoredData.push({ ...lead, mobileScore: "Error" });
        errorCount++;
        continue;
      }

      console.log(
        `[${scoredData.length + 1}/${leads.length}] Fetching PageSpeed metrics for: ${targetUrl}...`,
      );
      try {
        // Construct the API URL targeting mobile strategy
        const apiKey = process.env.PAGESPEED_API_KEY;
        let apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&strategy=mobile`;
        if (apiKey) apiUrl += `&key=${apiKey}`;

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP Status ${response.status}`);

        const jsonResponse = await response.json();

        // Extract performance category score and convert (0 to 1) float to (0 to 100) integer
        const rawScore =
          jsonResponse.lighthouseResult?.categories?.performance?.score;

        if (rawScore == null) {
          throw new Error("API response missing performance score payload");
        }

        const mobileScore = Math.round(rawScore * 100);
        console.log(`  ✅ Success | Score: ${mobileScore}`);

        scoredData.push({
          ...lead,
          mobileScore,
        });
        successCount++;
      } catch (error) {
        console.error(
          `  ❌ Failed: ${error.message || "Dead link or Network error"}`,
        );
        scoredData.push({ ...lead, mobileScore: "Error" });
        errorCount++;
      }

      // Strict 2500ms rate limit delay between API calls
      await delay(2500);
    }

    // 3. Finalize and write true output
    await fs.writeFile(
      "./scoredData.json",
      JSON.stringify(scoredData, null, 2),
    );

    console.log("\n--- Extraction Complete ---");
    console.log(`Total Processed: ${leads.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Errors/Skipped: ${errorCount}`);
    console.log("Results written to scoredData.json.");
  } catch (error) {
    if (error.code === "ENOENT") {
      console.error(
        "❌ Critical Error: data.json not found in the root directory. Please provide the dataset.",
      );
    } else {
      console.error("❌ Critical Script Error:", error.message);
    }
  }
}

// Execute the script
runPerformanceScraper();
