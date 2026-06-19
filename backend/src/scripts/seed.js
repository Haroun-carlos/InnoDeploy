const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const { EJSON } = require("bson");

// Load environment variables from backend root directory
require("dotenv").config({ path: path.resolve(__dirname, "..", "..", ".env") });
require("dotenv").config({ path: path.resolve(__dirname, "..", "..", ".env.local"), override: true });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/innodeploy";

async function seedDatabase() {
  console.log(`[Seed] Connecting to MongoDB at ${MONGO_URI}...`);
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected.");

    const db = mongoose.connection.db;
    const seedsDir = path.resolve(__dirname, "..", "seeds");

    if (!fs.existsSync(seedsDir)) {
      console.error(`❌ Seeds directory not found at: ${seedsDir}`);
      process.exit(1);
    }

    const files = fs.readdirSync(seedsDir).filter(file => file.endsWith(".json"));

    if (files.length === 0) {
      console.warn("⚠️ No seed files found in the seeds directory.");
      return;
    }

    for (const file of files) {
      const colName = path.basename(file, ".json");
      const filePath = path.join(seedsDir, file);
      
      const fileContent = fs.readFileSync(filePath, "utf8");
      const parsedData = JSON.parse(fileContent);

      // Convert the plain JSON back into BSON format losslessly
      const docs = EJSON.parse(JSON.stringify(parsedData));

      console.log(`[Seed] Clearing collection "${colName}"...`);
      await db.collection(colName).deleteMany({});

      if (docs.length > 0) {
        console.log(`[Seed] Inserting ${docs.length} documents into collection "${colName}"...`);
        await db.collection(colName).insertMany(docs);
        console.log(`[Seed] Successfully seeded "${colName}".`);
      } else {
        console.log(`[Seed] Collection "${colName}" was empty, cleared existing records.`);
      }
    }

    console.log("🎉 Database seeding complete!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
  }
}

seedDatabase();
