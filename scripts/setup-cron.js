#!/usr/bin/env node

/**
 * This script sets up cron jobs to regularly sync fine-tuning jobs with OpenAI.
 * It can be used in production environments to ensure job statuses are kept up to date.
 *
 * Usage:
 * 1. Make the script executable: chmod +x scripts/setup-cron.js
 * 2. Run the script: ./scripts/setup-cron.js
 *
 * Requirements:
 * - node-cron package: npm install node-cron
 * - dotenv package: npm install dotenv
 * - node-fetch package: npm install node-fetch
 */

const cron = require("node-cron");
const fetch = require("node-fetch");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Configuration
const API_KEY = process.env.INTERNAL_API_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8080";

if (!API_KEY) {
  console.error("Error: INTERNAL_API_KEY is not set in .env.local");
  console.error(
    "Please set this environment variable to a secure random string"
  );
  process.exit(1);
}

// Function to call the sync API
async function syncFineTuningJobs() {
  try {
    console.log(
      `[${new Date().toISOString()}] Syncing fine-tuning jobs with OpenAI...`
    );

    const response = await fetch(
      `${BASE_URL}/api/cron/fine-tuning-sync?task=sync`,
      {
        headers: {
          "x-api-key": API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `API returned ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log(
      `[${new Date().toISOString()}] Sync completed: ${data.message}`
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error syncing fine-tuning jobs:`,
      error
    );
  }
}

// Function to clean up stale jobs
async function cleanupStaleJobs() {
  try {
    console.log(
      `[${new Date().toISOString()}] Cleaning up stale fine-tuning jobs...`
    );

    const response = await fetch(
      `${BASE_URL}/api/cron/fine-tuning-sync?task=cleanup`,
      {
        headers: {
          "x-api-key": API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `API returned ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log(
      `[${new Date().toISOString()}] Cleanup completed: ${data.message}`
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error cleaning up stale jobs:`,
      error
    );
  }
}

// Schedule the sync job to run every 5 minutes
cron.schedule("*/5 * * * *", syncFineTuningJobs);

// Schedule the cleanup job to run once a day at midnight
cron.schedule("0 0 * * *", cleanupStaleJobs);

// Run the sync job immediately on startup
syncFineTuningJobs();

console.log("Cron jobs scheduled:");
console.log("- Fine-tuning job sync: every 5 minutes");
console.log("- Stale job cleanup: daily at midnight");
console.log("Press Ctrl+C to stop");

// Export functions for individual use
module.exports = {
  syncFineTuningJobs,
  cleanupStaleJobs,
};
