import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CompanySetting, Department, Employee, SlackReadReceipt, User } from "../../database/entities";
import { SlackController } from "./slack.controller";
import { SlackService } from "./slack.service";

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET", "dev-secret"),
      }),
    }),
    TypeOrmModule.forFeature([User, CompanySetting, Department, Employee, SlackReadReceipt]),
  ],
  controllers: [SlackController],
  providers: [SlackService],
})
export class SlackModule {}
