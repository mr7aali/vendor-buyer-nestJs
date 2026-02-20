import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
// import { PrismaModule } from "./prisma/prisma.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { VendorBuyerConnectionsModule } from "./vendor-buyer-connections/vendor-buyer-connections.module.js";
import { CategoriesModule } from "./categories/categories.module.js";
import { ProductsModule } from "./products/products.module.js";
import { CartModule } from "./cart/cart.module.js";
import { OrdersModule } from "./orders/orders.module.js";
import { PaymentsModule } from "./payments/payments.module.js";
import { CouponsModule } from "./coupons/coupons.module.js";
import { MessagesModule } from "./messages/messages.module.js";
import { NotificationsModule } from "./notifications/notifications.module.js";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { CloudinaryModule } from "./cloudinary/cloudinary.module";
import { ReviewModule } from "./prisma/review.module.js";
import { AdminDashboardModule } from "./dashboard/dashboard.module.js";
import { AnalyticsModule } from "./analytics/analytics.module.js";
import { ChattingWithAdminModule } from "./chatting-with-admin/chatting-with-admin.module.js";
import { TransactionHistoryModule } from "./transaction-history/transaction-history.module.js";
// import { MessagesGateway } from "./messages/messages.gateway.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // envFilePath: ".env",
    }),
    PrismaModule,
    AuthModule,
    VendorBuyerConnectionsModule,
    CategoriesModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    CouponsModule,
    MessagesModule,
    NotificationsModule,
    CloudinaryModule,
    ReviewModule,
    AdminDashboardModule,
    AnalyticsModule,
    ChattingWithAdminModule,
    TransactionHistoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
