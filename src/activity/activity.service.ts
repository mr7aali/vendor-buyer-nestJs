import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityPayload } from "./activity.types";

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async log(payload: ActivityPayload) {
    return this.prisma.activityLog.create({
      data: payload,
    });
  }

  // fire & forget
  logAsync(payload: ActivityPayload) {
    this.log(payload).catch(() => {});
  }

  async getRecent(limit = 10) {
    return this.prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}
