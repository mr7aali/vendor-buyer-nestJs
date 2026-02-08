import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import bodyParser from "body-parser";
import { SocketIoAdapter } from "./common/adapters/socket-io.adapter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });
  // IMPORTANT: raw body for Stripe webhook
  app.use("/payments/webhook", bodyParser.raw({ type: "application/json" }));
  app.useWebSocketAdapter(new SocketIoAdapter(app));
  const config = new DocumentBuilder()
    .setTitle("E-commerce Admin Dashboard API")
    .setDescription(
      "Comprehensive REST API for e-commerce platform with vendor-buyer connections, product management, shopping cart, orders, Stripe payments, coupons, messaging, and notifications. All endpoints require JWT authentication unless specified otherwise.",
    )
    .setVersion("1.0")
    .addTag("Authentication", "User registration and login endpoints")
    .addTag(
      "Vendor-Buyer Connections",
      "Manage connections between vendors and buyers",
    )
    .addTag("Categories", "Category management for vendors")
    .addTag("Products", "Product management for vendors")
    .addTag("Cart", "Shopping cart operations for buyers")
    .addTag("Orders", "Order management and tracking")
    .addTag("Payments", "Payment processing with Stripe")
    .addTag("Coupons", "Coupon and discount management")
    .addTag("Messages", "Vendor-buyer messaging system")
    .addTag("Notifications", "User notification management")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "JWT",
        description: "Enter JWT token",
        in: "header",
      },
      "JWT-auth", // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .addServer("http://localhost:3000", "Development server")
    .addServer("https://api.example.com", "Production server")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

  app.useGlobalInterceptors(new ResponseInterceptor());

  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Set global prefix
  // app.setGlobalPrefix("api");

  const port = process.env.PORT ?? 3000;

  // 🔥 IMPORTANT: Listen on 0.0.0.0 for Railway
  await app.listen(port, "0.0.0.0");
  // await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
}
bootstrap();
