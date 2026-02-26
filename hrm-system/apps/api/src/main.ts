import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import * as bcrypt from "bcrypt";
import * as express from "express";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { DataSource } from "typeorm";
import { UserRole } from "./common/types/enums";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { AppModule } from "./app.module";
import { User } from "./database/entities";

async function seedSuperAdmin(dataSource: DataSource): Promise<void> {
  const userRepository = dataSource.getRepository(User);
  const existing = await userRepository.findOne({ where: { email: "admin@hrm.com" } });
  if (!existing) {
    const user = userRepository.create({
      email: "admin@hrm.com",
      password: await bcrypt.hash("Admin@123", 10),
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    });
    await userRepository.save(user);
  }
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const uploadDir = configService.get<string>("UPLOAD_DIR", "uploads");
  const uploadPath = join(process.cwd(), uploadDir);
  const avatarDir = join(uploadPath, "avatars");
  const documentDir = join(uploadPath, "documents");

  for (const dir of [uploadPath, avatarDir, documentDir]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  app.use(`/uploads`, express.static(uploadPath));
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidUnknownValues: false }));
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle("HRM API")
    .setDescription("Human Resource Management System API")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, swaggerDocument);

  const dataSource = app.get(DataSource);
  await seedSuperAdmin(dataSource);

  const port = Number(configService.get<string>("PORT", "4000"));
  await app.listen(port);
}

void bootstrap();
