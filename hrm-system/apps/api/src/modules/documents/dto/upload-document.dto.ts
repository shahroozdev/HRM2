import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsString } from "class-validator";
import { DocumentAccessLevel, DocumentType } from "../../../common/types/enums";

export class UploadDocumentDto {
  @ApiProperty()
  @IsString()
  employeeId!: string;

  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  type!: DocumentType;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: DocumentAccessLevel })
  @IsEnum(DocumentAccessLevel)
  accessLevel!: DocumentAccessLevel;
}
