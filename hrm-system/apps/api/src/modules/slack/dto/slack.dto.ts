import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class OpenDmDto {
  @ApiProperty()
  @IsString()
  targetUserId!: string;
}

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  @MaxLength(4000)
  text!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  threadTs?: string;
}

export class CreateDepartmentChannelDto {
  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiProperty({ required: false, default: "dept" })
  @IsOptional()
  @IsString()
  prefix?: string;
}

export class TypingDto {
  @ApiProperty({ default: true })
  @IsBoolean()
  isTyping!: boolean;
}

export class MarkReadDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastReadTs?: string;
}

export class UploadSlackFileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  threadTs?: string;
}
