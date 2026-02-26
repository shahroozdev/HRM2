import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1700000000000 implements MigrationInterface {
  name = "InitialSchema1700000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('super_admin', 'hr_manager', 'manager', 'employee')`);
    await queryRunner.query(`CREATE TYPE "public"."employees_employmenttype_enum" AS ENUM('full_time', 'part_time', 'contract')`);
    await queryRunner.query(`CREATE TYPE "public"."employees_status_enum" AS ENUM('active', 'inactive', 'terminated')`);
    await queryRunner.query(`CREATE TYPE "public"."attendance_status_enum" AS ENUM('present', 'absent', 'late', 'half_day')`);
    await queryRunner.query(`CREATE TYPE "public"."leave_requests_status_enum" AS ENUM('pending', 'approved', 'rejected')`);
    await queryRunner.query(`CREATE TYPE "public"."payrolls_status_enum" AS ENUM('draft', 'processed', 'paid')`);
    await queryRunner.query(`CREATE TYPE "public"."documents_type_enum" AS ENUM('offer', 'appointment', 'experience', 'warning', 'other')`);
    await queryRunner.query(`CREATE TYPE "public"."documents_accesslevel_enum" AS ENUM('employee', 'manager', 'hr', 'admin')`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        "role" "public"."users_role_enum" NOT NULL DEFAULT 'employee',
        "isActive" boolean NOT NULL DEFAULT true,
        "resetToken" character varying,
        "resetTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "departments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" character varying,
        "headId" uuid,
        CONSTRAINT "PK_departments_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_departments_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "designations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "departmentId" uuid NOT NULL,
        CONSTRAINT "PK_designations_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "employees" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "employeeId" character varying NOT NULL,
        "userId" uuid NOT NULL,
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "avatar" character varying,
        "phone" character varying,
        "address" character varying,
        "cnic" character varying,
        "emergencyContact" jsonb,
        "departmentId" uuid,
        "designationId" uuid,
        "reportingManagerId" uuid,
        "joinDate" date NOT NULL,
        "employmentType" "public"."employees_employmenttype_enum" NOT NULL DEFAULT 'full_time',
        "workLocation" character varying,
        "status" "public"."employees_status_enum" NOT NULL DEFAULT 'active',
        CONSTRAINT "PK_employees_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_employees_employeeId" UNIQUE ("employeeId"),
        CONSTRAINT "UQ_employees_userId" UNIQUE ("userId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "attendance" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "employeeId" uuid NOT NULL,
        "date" date NOT NULL,
        "checkIn" TIMESTAMP WITH TIME ZONE,
        "checkOut" TIMESTAMP WITH TIME ZONE,
        "status" "public"."attendance_status_enum" NOT NULL DEFAULT 'present',
        "overtimeMinutes" integer NOT NULL DEFAULT 0,
        "notes" text,
        CONSTRAINT "PK_attendance_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "leave_types" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "totalDays" integer NOT NULL,
        "isPaid" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_leave_types_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_leave_types_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "leave_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "employeeId" uuid NOT NULL,
        "leaveTypeId" uuid NOT NULL,
        "startDate" date NOT NULL,
        "endDate" date NOT NULL,
        "totalDays" integer NOT NULL,
        "reason" text NOT NULL,
        "status" "public"."leave_requests_status_enum" NOT NULL DEFAULT 'pending',
        "reviewedBy" uuid,
        "reviewedAt" TIMESTAMP WITH TIME ZONE,
        "remarks" text,
        CONSTRAINT "PK_leave_requests_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "salary_structures" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "employeeId" uuid NOT NULL,
        "basicSalary" numeric(12,2) NOT NULL,
        "houseAllowance" numeric(12,2) NOT NULL DEFAULT 0,
        "medicalAllowance" numeric(12,2) NOT NULL DEFAULT 0,
        "transportAllowance" numeric(12,2) NOT NULL DEFAULT 0,
        "taxRate" numeric(5,2) NOT NULL DEFAULT 0,
        CONSTRAINT "PK_salary_structures_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_salary_structures_employeeId" UNIQUE ("employeeId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "payrolls" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "employeeId" uuid NOT NULL,
        "month" integer NOT NULL,
        "year" integer NOT NULL,
        "basicSalary" numeric(12,2) NOT NULL,
        "totalAllowances" numeric(12,2) NOT NULL,
        "overtimePay" numeric(12,2) NOT NULL DEFAULT 0,
        "bonus" numeric(12,2) NOT NULL DEFAULT 0,
        "grossSalary" numeric(12,2) NOT NULL,
        "taxDeduction" numeric(12,2) NOT NULL DEFAULT 0,
        "leaveDeductions" numeric(12,2) NOT NULL DEFAULT 0,
        "netSalary" numeric(12,2) NOT NULL,
        "status" "public"."payrolls_status_enum" NOT NULL DEFAULT 'draft',
        CONSTRAINT "PK_payrolls_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "employeeId" uuid NOT NULL,
        "type" "public"."documents_type_enum" NOT NULL,
        "name" character varying NOT NULL,
        "filePath" character varying NOT NULL,
        "uploadedById" uuid NOT NULL,
        "accessLevel" "public"."documents_accesslevel_enum" NOT NULL DEFAULT 'employee',
        CONSTRAINT "PK_documents_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "title" character varying NOT NULL,
        "message" text NOT NULL,
        "type" character varying,
        "isRead" boolean NOT NULL DEFAULT false,
        "link" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "company_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "key" character varying NOT NULL,
        "value" jsonb NOT NULL,
        CONSTRAINT "PK_company_settings_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_company_settings_key" UNIQUE ("key")
      )
    `);

    await queryRunner.query(`ALTER TABLE "designations" ADD CONSTRAINT "FK_designations_department" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_employees_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_employees_department" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL`);
    await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_employees_designation" FOREIGN KEY ("designationId") REFERENCES "designations"("id") ON DELETE SET NULL`);
    await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_employees_reporting_manager" FOREIGN KEY ("reportingManagerId") REFERENCES "employees"("id") ON DELETE SET NULL`);
    await queryRunner.query(`ALTER TABLE "departments" ADD CONSTRAINT "FK_departments_head" FOREIGN KEY ("headId") REFERENCES "employees"("id") ON DELETE SET NULL`);
    await queryRunner.query(`ALTER TABLE "attendance" ADD CONSTRAINT "FK_attendance_employee" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "leave_requests" ADD CONSTRAINT "FK_leave_requests_employee" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "leave_requests" ADD CONSTRAINT "FK_leave_requests_type" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_types"("id") ON DELETE RESTRICT`);
    await queryRunner.query(`ALTER TABLE "leave_requests" ADD CONSTRAINT "FK_leave_requests_reviewer" FOREIGN KEY ("reviewedBy") REFERENCES "employees"("id") ON DELETE SET NULL`);
    await queryRunner.query(`ALTER TABLE "salary_structures" ADD CONSTRAINT "FK_salary_structures_employee" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "payrolls" ADD CONSTRAINT "FK_payrolls_employee" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_documents_employee" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_documents_uploader" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_user"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_documents_uploader"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_documents_employee"`);
    await queryRunner.query(`ALTER TABLE "payrolls" DROP CONSTRAINT "FK_payrolls_employee"`);
    await queryRunner.query(`ALTER TABLE "salary_structures" DROP CONSTRAINT "FK_salary_structures_employee"`);
    await queryRunner.query(`ALTER TABLE "leave_requests" DROP CONSTRAINT "FK_leave_requests_reviewer"`);
    await queryRunner.query(`ALTER TABLE "leave_requests" DROP CONSTRAINT "FK_leave_requests_type"`);
    await queryRunner.query(`ALTER TABLE "leave_requests" DROP CONSTRAINT "FK_leave_requests_employee"`);
    await queryRunner.query(`ALTER TABLE "attendance" DROP CONSTRAINT "FK_attendance_employee"`);
    await queryRunner.query(`ALTER TABLE "departments" DROP CONSTRAINT "FK_departments_head"`);
    await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_employees_reporting_manager"`);
    await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_employees_designation"`);
    await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_employees_department"`);
    await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_employees_user"`);
    await queryRunner.query(`ALTER TABLE "designations" DROP CONSTRAINT "FK_designations_department"`);

    await queryRunner.query(`DROP TABLE "company_settings"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TABLE "documents"`);
    await queryRunner.query(`DROP TABLE "payrolls"`);
    await queryRunner.query(`DROP TABLE "salary_structures"`);
    await queryRunner.query(`DROP TABLE "leave_requests"`);
    await queryRunner.query(`DROP TABLE "leave_types"`);
    await queryRunner.query(`DROP TABLE "attendance"`);
    await queryRunner.query(`DROP TABLE "employees"`);
    await queryRunner.query(`DROP TABLE "designations"`);
    await queryRunner.query(`DROP TABLE "departments"`);
    await queryRunner.query(`DROP TABLE "users"`);

    await queryRunner.query(`DROP TYPE "public"."documents_accesslevel_enum"`);
    await queryRunner.query(`DROP TYPE "public"."documents_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."payrolls_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."leave_requests_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."attendance_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."employees_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."employees_employmenttype_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
