import { Module } from "@nestjs/common";
// import { ReviewController } from "./review.controller";
// import { ReviewService } from "./review.service";
import { PrismaModule } from "../prisma/prisma.module";
import { ReviewController } from "src/review/review.controller";
import { ReviewService } from "src/review/review.service";

@Module({
  imports: [PrismaModule],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
