const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const { EJSON } = require("bson");

// Load environment variables from backend root directory
require("dotenv").config({ path: path.resolve(__dirname, "..", "..", ".env") });
require("dotenv").config({ path: path.resolve(__dirname, "..", "..", ".env.local"), override: true });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/innodeploy";

async function exportDatabase() {
  console.log(`[Export] Connecting to MongoDB at ${MONGO_URI}...`);
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected.");

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    const seedsDir = path.resolve(__dirname, "..", "seeds");
    if (!fs.existsSync(seedsDir)) {
      fs.mkdirSync(seedsDir, { recursive: true });
    }

    for (const colInfo of collections) {
      const colName = colInfo.name;
      if (colName.startsWith("system.")) {
        continue;
      }

      const docs = await db.collection(colName).find({}).toArray();
      const filePath = path.join(seedsDir, `${colName}.json`);

      // Losslessly stringify BSON documents to Extended JSON (relaxed format for readability)
      const ejsonStr = EJSON.stringify(docs, { relaxed: true });
      // Re-parse and pretty print standard JSON format for repo storage
      const prettyJson = JSON.stringify(JSON.parse(ejsonStr), null, 2);

      fs.writeFileSync(filePath, prettyJson, "utf8");
      console.log(`[Export] Successfully exported ${docs.length} documents from "${colName}" to src/seeds/${colName}.json`);
    }

    console.log("🎉 Database export complete!");
  } catch (error) {
    console.error("❌ Export failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
  }
}

exportDatabase();
