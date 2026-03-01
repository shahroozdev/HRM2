import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ExpressAdapter } from "@nestjs/platform-express";
import * as bcrypt from "bcrypt";
import express, { Request, Response } from "express";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { DataSource } from "typeorm";
import { UserRole } from "./common/types/enums";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { AppModule } from "./app.module";
import { User } from "./database/entities";

let cachedServer: express.Express | null = null;

function landingHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HRM API</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #f3f5fa; color: #0f172a; }
      .wrap { max-width: 760px; margin: 56px auto; padding: 28px; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; }
      h1 { margin: 0 0 10px; font-size: 30px; }
      p { margin: 0 0 14px; line-height: 1.6; color: #334155; }
      .btn { display: inline-block; margin-top: 12px; background: #4f46e5; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 10px; font-weight: 600; }
      .meta { margin-top: 16px; font-size: 13px; color: #64748b; }
    </style>
  </head>
  <body>
    <main class="wrap">
      <h1>Welcome to HRM API</h1>
      <p>This Human Resource Management backend powers employee management, attendance, leave workflows, payroll processing, documents, notifications, reports, and system settings.</p>
      <p>Use the interactive Swagger documentation to explore endpoints, request/response schemas, and authentication requirements.</p>
      <a class="btn" href="/api/docs">Read API Docs</a>
      <div class="meta">Tip: authorize with <strong>Bearer JWT</strong> in Swagger to access protected routes.</div>
    </main>
  </body>
</html>`;
}

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

async function createServer(): Promise<express.Express> {
  if (cachedServer) {
    return cachedServer;
  }

  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
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
  app.getHttpAdapter().get("/", (_req: any, res: any) => {
    res.type("html").send(landingHtml());
  });
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

  await app.init();
  cachedServer = server;
  return server;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  const server = await createServer();
  server(req, res);
}
