import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

export class ForgotPasswordDto {
  @ApiProperty({ example: "employee@hrm.com" })
  @IsEmail()
  email!: string;
}
