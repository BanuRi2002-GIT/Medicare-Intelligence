
import { prisma } from "./lib/prisma";

async function testDatabaseConnection() {
  try {
    await prisma.$connect();

    console.log("Successfully connected to MySQL!");
    
    const result = await prisma.$queryRaw`SELECT 1 AS connection_test`;

    console.log("Database test result:", result);
  } catch (error) {
    console.error("Database connection failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();
