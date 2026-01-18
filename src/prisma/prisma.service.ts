import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "../../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not defined");
    }

    const adapter = new PrismaPg({
      connectionString: databaseUrl,
    });

    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log("✅ Prisma connected to database");
    } catch (err) {
      console.error("❌ Prisma connection failed", err);
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
