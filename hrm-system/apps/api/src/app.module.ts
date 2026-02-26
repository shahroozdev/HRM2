import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { join } from "path";
import {
  Attendance,
  CompanySetting,
  Department,
  Designation,
  Document,
  Employee,
  LeaveRequest,
  LeaveType,
  Notification,
  Payroll,
  SalaryStructure,
  User,
} from "./database/entities";
import { AuthModule } from "./modules/auth/auth.module";
import { EmployeesModule } from "./modules/employees/employees.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { LeavesModule } from "./modules/leaves/leaves.module";
import { PayrollModule } from "./modules/payroll/payroll.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { SettingsModule } from "./modules/settings/settings.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>("DATABASE_URL");

        return {
          type: "postgres",
          ...(databaseUrl
            ? { url: databaseUrl }
            : {
                host: config.get<string>("DB_HOST", "localhost"),
                port: Number(config.get<string>("DB_PORT", "5432")),
                username: config.get<string>("DB_USER", "postgres"),
                password: config.get<string>("DB_PASSWORD", "postgres"),
                database: config.get<string>("DB_NAME", "hrm"),
              }),
          synchronize: false,
          migrationsRun: true,
          autoLoadEntities: true,
          entities: [
            User,
            Employee,
            Department,
            Designation,
            Attendance,
            LeaveType,
            LeaveRequest,
            SalaryStructure,
            Payroll,
            Document,
            Notification,
            CompanySetting,
          ],
          migrations: [join(__dirname, "database/migrations/*.js")],
        };
      },
    }),
    AuthModule,
    EmployeesModule,
    AttendanceModule,
    LeavesModule,
    PayrollModule,
    DocumentsModule,
    ReportsModule,
    NotificationsModule,
    SettingsModule,
  ],
})
export class AppModule {}
