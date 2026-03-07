import "dotenv/config";
import { DataSource } from "typeorm";
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
  SlackReadReceipt,
  User,
} from "./entities";

const dataSource = new DataSource({
  type: "postgres",
  ...(process.env.DATABASE_URL
    ? { url: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST ?? "localhost",
        port: Number(process.env.DB_PORT ?? "5432"),
        username: process.env.DB_USER ?? "postgres",
        password: process.env.DB_PASSWORD ?? "123",
        database: process.env.DB_NAME ?? "hrm",
      }),
  synchronize: false,
  logging: false,
  extra: {
    max: Number(process.env.DB_POOL_MAX ?? "5"),
    idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_MS ?? "30000"),
    connectionTimeoutMillis: Number(process.env.DB_POOL_CONN_TIMEOUT_MS ?? "10000"),
  },
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
    SlackReadReceipt,
  ],
  migrations: ["src/database/migrations/*{.ts,.js}"],
});

export default dataSource;
