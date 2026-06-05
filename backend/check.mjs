import 'dotenv/config';

const uri = process.env.MONGO_URI;

if (!uri) {
  console.log("MONGO_URI is undefined — .env file not loading");
  process.exit(1);
}

console.log("✅ .env loaded successfully");
console.log("Starts with    :", uri.substring(0, 30) + "...");
console.log("Has <password> :", uri.includes("<password>"));
console.log("Has spaces     :", uri.includes(" "));
console.log("Protocol ok    :", uri.startsWith("mongodb+srv://") || uri.startsWith("mongodb://"));
console.log("Has @ symbol   :", uri.includes("@"));
