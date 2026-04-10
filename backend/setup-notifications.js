#!/usr/bin/env node

/**
 * InnoDeploy Notification Setup Script
 * 
 * This script configures notification channels for your organization.
 * It prompts for settings and updates MongoDB directly.
 * 
 * Usage: node setup-notifications.js
 */

const readline = require("readline");
const { MongoClient } = require("mongodb");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt) =>
  new Promise((resolve) => {
    rl.question(prompt, resolve);
  });

const main = async () => {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   InnoDeploy Notification Channel Setup                  ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  try {
    // Get MongoDB configuration
    console.log("📍 MongoDB Configuration:");
    const mongoUri =
      (await question("  MongoDB URI [mongodb://localhost:27017]: ")) ||
      "mongodb://localhost:27017";
    const dbName =
      (await question("  Database name [innodeploy]: ")) || "innodeploy";

    // Connect to MongoDB
    console.log("\n🔄 Connecting to MongoDB...");
    const client = new MongoClient(mongoUri);
    await client.connect();
    const db = client.db(dbName);
    const organisations = db.collection("organisations");

    // Get organization
    console.log("\n📋 Available Organizations:");
    const orgs = await organisations.find({}).project({ _id: 1, name: 1 }).toArray();

    if (orgs.length === 0) {
      console.log("  ❌ No organizations found!");
      process.exit(1);
    }

    orgs.forEach((org, i) => {
      console.log(`  ${i + 1}. ${org.name} (${org._id})`);
    });

    const orgIndex = parseInt(await question("\nSelect organization [1]: ") || "1") - 1;
    const selectedOrg = orgs[orgIndex];

    if (!selectedOrg) {
      console.log("❌ Invalid selection");
      process.exit(1);
    }

    console.log(`\n✅ Selected: ${selectedOrg.name}`);

    // Configure channels
    const channels = {};

    // Email
    console.log("\n📧 Email Configuration:");
    const emailEnabled = (await question("Enable email [y/n]: ")) === "y";
    if (emailEnabled) {
      channels.emailEnabled = true;
      channels.smtpHost = await question("  SMTP Host [smtp.gmail.com]: ") || "smtp.gmail.com";
      channels.smtpPort = parseInt(await question("  SMTP Port [587]: ") || "587");
      channels.smtpUsername = await question("  SMTP Username: ");
      channels.smtpPassword = await question("  SMTP Password: ");
      channels.smtpFromEmail = await question("  From Email: ");
      const recipients = await question("  Recipients (comma separated, leave empty for org members): ");
      channels.emailRecipients = recipients
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
    }

    // Slack
    console.log("\n💬 Slack Configuration:");
    const slackEnabled = (await question("Enable Slack [y/n]: ")) === "y";
    if (slackEnabled) {
      channels.slackEnabled = true;
      channels.slackWebhook = await question("  Webhook URL: ");
    }

    // Discord
    console.log("\n🎮 Discord Configuration:");
    const discordEnabled = (await question("Enable Discord [y/n]: ")) === "y";
    if (discordEnabled) {
      channels.discordEnabled = true;
      channels.discordWebhook = await question("  Webhook URL: ");
    }

    // Generic Webhook
    console.log("\n🔗 Generic Webhook Configuration:");
    const webhookEnabled = (await question("Enable generic webhook [y/n]: ")) === "y";
    if (webhookEnabled) {
      channels.webhookEnabled = true;
      channels.webhookUrl = await question("  Webhook URL: ");
      const headersStr = await question("  Custom headers (JSON format, optional): ");
      if (headersStr) {
        try {
          channels.webhookHeaders = JSON.parse(headersStr);
        } catch {
          console.log("⚠️  Invalid JSON, skipping headers");
        }
      }
    }

    // Confirm and save
    console.log("\n📝 Configuration Summary:");
    console.log(`  Email: ${channels.emailEnabled ? "✅ Enabled" : "❌ Disabled"}`);
    console.log(`  Slack: ${channels.slackEnabled ? "✅ Enabled" : "❌ Disabled"}`);
    console.log(`  Discord: ${channels.discordEnabled ? "✅ Enabled" : "❌ Disabled"}`);
    console.log(`  Webhook: ${channels.webhookEnabled ? "✅ Enabled" : "❌ Disabled"}`);

    const confirm = await question("\nSave configuration? [y/n]: ");
    if (confirm !== "y") {
      console.log("❌ Cancelled");
      process.exit(0);
    }

    // Update MongoDB
    console.log("\n💾 Saving to MongoDB...");
    await organisations.updateOne(
      { _id: selectedOrg._id },
      {
        $set: {
          notificationChannels: channels,
        },
      }
    );

    console.log("✅ Configuration saved successfully!\n");

    // Test email
    if (channels.emailEnabled) {
      const testEmail = await question("Send test email [y/n]: ");
      if (testEmail === "y") {
        const testTo = await question("  Recipient email: ");
        console.log("\n📧 To test notifications:");
        console.log(`  1. Go to http://localhost:3000/dashboard/settings/alerts`);
        console.log(`  2. Click "Test Notification"`);
        console.log(`  3. Check ${testTo} and other channels\n`);
      }
    }

    await client.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

main();
