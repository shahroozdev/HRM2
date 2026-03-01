import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { AuthenticatedUser } from "../../common/types/api.types";
import { DocumentAccessLevel, UserRole } from "../../common/types/enums";
import { ok } from "../../common/utils/response.util";
import { isAdminRole } from "../../common/utils/role.util";
import { deleteCloudinaryAssetByUrl, uploadBufferToCloudinary } from "../../common/utils/cloudinary.util";
import { Document, Employee } from "../../database/entities";
import { UploadDocumentDto } from "./dto/upload-document.dto";

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document) private readonly documentRepository: Repository<Document>,
    @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
  ) {}

  private async scopedEmployeeIds(user: AuthenticatedUser): Promise<string[] | null> {
    if (isAdminRole(user.role)) {
      return null;
    }

    const self = await this.employeeRepository.findOne({ where: { userId: user.sub } });
    if (!self) {
      return [];
    }

    if (user.role === UserRole.EMPLOYEE) {
      return [self.id];
    }

    const team = await this.employeeRepository.find({ where: { reportingManagerId: self.id }, select: { id: true } });
    return [self.id, ...team.map((member) => member.id)];
  }

  async list(user: AuthenticatedUser) {
    const ids = await this.scopedEmployeeIds(user);
    const rows = await this.documentRepository.find({
      where: ids ? { employeeId: In(ids) } : {},
      relations: { employee: true, uploadedBy: true },
      order: { id: "DESC" },
    });

    return ok(rows, "Documents fetched", { total: rows.length });
  }

  async upload(user: AuthenticatedUser, dto: UploadDocumentDto, file: Express.Multer.File) {
    if (!isAdminRole(user.role) && user.role !== UserRole.MANAGER) {
      const self = await this.employeeRepository.findOne({ where: { userId: user.sub } });
      if (!self || self.id !== dto.employeeId) {
        throw new ForbiddenException("You can upload documents only for yourself");
      }
    }

    if (user.role === UserRole.MANAGER) {
      const manager = await this.employeeRepository.findOne({ where: { userId: user.sub } });
      const isTeamMember = await this.employeeRepository.exists({
        where: { id: dto.employeeId, reportingManagerId: manager?.id },
      });
      if (!manager || (!isTeamMember && manager.id !== dto.employeeId)) {
        throw new ForbiddenException("Managers can upload documents only for team members");
      }
    }

    if (!file) {
      throw new ForbiddenException("Document file is required");
    }

    const uploaded = await uploadBufferToCloudinary(file, {
      folder: "hrm/documents",
      resource_type: "auto",
      use_filename: true,
      unique_filename: true,
    });

    const record = this.documentRepository.create({
      employeeId: dto.employeeId,
      type: dto.type,
      name: dto.name,
      filePath: uploaded.secure_url,
      uploadedById: user.sub,
      accessLevel: dto.accessLevel,
    });

    await this.documentRepository.save(record);
    return ok(record, "Document uploaded");
  }

  async remove(id: string, user: AuthenticatedUser) {
    const doc = await this.documentRepository.findOne({ where: { id } });
    if (!doc) {
      throw new NotFoundException("Document not found");
    }

    if (!isAdminRole(user.role)) {
      const self = await this.employeeRepository.findOne({ where: { userId: user.sub } });
      if (!self) {
        throw new ForbiddenException("No access");
      }

      if (user.role === UserRole.EMPLOYEE && self.id !== doc.employeeId) {
        throw new ForbiddenException("No access");
      }

      if (user.role === UserRole.MANAGER) {
        const isTeamMember = await this.employeeRepository.exists({
          where: { id: doc.employeeId, reportingManagerId: self.id },
        });
        if (!isTeamMember && self.id !== doc.employeeId) {
          throw new ForbiddenException("No access");
        }
      }
    }

    await deleteCloudinaryAssetByUrl(doc.filePath);
    await this.documentRepository.delete(doc.id);
    return ok({ deleted: true }, "Document deleted");
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const doc = await this.documentRepository.findOne({ where: { id } });
    if (!doc) {
      throw new NotFoundException("Document not found");
    }

    if (isAdminRole(user.role)) {
      return doc;
    }

    const self = await this.employeeRepository.findOne({ where: { userId: user.sub } });
    if (!self) {
      throw new ForbiddenException("No access");
    }

    if (user.role === UserRole.EMPLOYEE) {
      if (doc.employeeId !== self.id || doc.accessLevel === DocumentAccessLevel.ADMIN) {
        throw new ForbiddenException("No access");
      }
      return doc;
    }

    if (user.role === UserRole.MANAGER) {
      const isTeamMember = await this.employeeRepository.exists({
        where: { id: doc.employeeId, reportingManagerId: self.id },
      });
      if (!isTeamMember && doc.employeeId !== self.id) {
        throw new ForbiddenException("No access");
      }
      if (doc.accessLevel === DocumentAccessLevel.ADMIN) {
        throw new ForbiddenException("No access");
      }
    }

    return doc;
  }
}
