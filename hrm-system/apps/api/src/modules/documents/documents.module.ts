import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Document, Employee } from "../../database/entities";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";

@Module({
  imports: [TypeOrmModule.forFeature([Document, Employee])],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
