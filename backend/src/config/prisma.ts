import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const adapter = new PrismaPg({
    connectionString: process.env["SUPABASE_DB_URL"],
});

export const prisma = new PrismaClient({
    adapter,
});