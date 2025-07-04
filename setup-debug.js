const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
console.log("�� AppFlowy Clone - Debug Setup Script\n");
// Check if .env.local exists
const envPath = path.join(__dirname, ".env.local");
if (!fs.existsSync(envPath)) {
  console.log("📝 Creating .env.local file...");
  const envContent = `# Database
DATABASE_URL="file:./prisma/dev.db"
# NextAuth - Generate a secure secret with: openssl rand -base64 32
NEXTAUTH_SECRET="development-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
# AI Configuration - Using mock AI since AbacusAI key is not available
ABACUSAI_API_KEY="mock"
USE_MOCK_AI="true"
`;
  fs.writeFileSync(envPath, envContent);
  console.log("✅ .env.local created");
} else {
  console.log("✅ .env.local already exists");
}
// Install dependencies
console.log("\n📦 Installing dependencies...");
try {
  execSync("npm install", { stdio: "inherit" });
  console.log("✅ Dependencies installed");
} catch (error) {
  console.error("❌ Failed to install dependencies:", error.message);
  process.exit(1);
}
// Generate Prisma client
console.log("\n🔧 Generating Prisma client...");
try {
  execSync("npx prisma generate", { stdio: "inherit" });
  console.log("✅ Prisma client generated");
} catch (error) {
  console.error("❌ Failed to generate Prisma client:", error.message);
}
// Push database schema
console.log("\n🗄️ Setting up database...");
try {
  execSync("npx prisma db push", { stdio: "inherit" });
  console.log("✅ Database schema pushed");
} catch (error) {
  console.error("❌ Failed to push database schema:", error.message);
}
// Seed database
console.log("\n🌱 Seeding database...");
try {
  execSync("npm run prisma:seed", { stdio: "inherit" });
  console.log("✅ Database seeded");
} catch (error) {
  console.error("❌ Failed to seed database:", error.message);
}
console.log("\n✨ Setup complete! You can now run:");
console.log("   npm run dev      - Start development server");
console.log("   npm run test     - Run Puppeteer tests");
console.log("\n📌 Demo credentials:");
console.log("   Email: john@doe.com");
console.log("   Password: johndoe123");

