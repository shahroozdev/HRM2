import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomBytes } from "crypto";
import * as bcrypt from "bcrypt";
import * as nodemailer from "nodemailer";
import { User } from "../../database/entities";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { JwtPayload } from "../../common/types/api.types";
import { ok } from "../../common/utils/response.util";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Account is disabled");
    }

    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<string>("JWT_EXPIRES_IN", "1d") as any,
      secret: this.configService.get<string>("JWT_SECRET", "dev-secret"),
    });

    return ok(
      {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        },
      },
      "Login successful",
    );
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!user) {
      return ok({ sent: true }, "If the email exists, reset instructions have been sent");
    }

    const token = randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.userRepository.save(user);

    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>("MAIL_HOST"),
      port: Number(this.configService.get<string>("MAIL_PORT", "587")),
      secure: false,
      auth: {
        user: this.configService.get<string>("MAIL_USER"),
        pass: this.configService.get<string>("MAIL_PASS"),
      },
    });

    await transporter.sendMail({
      from: this.configService.get<string>("MAIL_USER"),
      to: user.email,
      subject: "HRM Password Reset",
      text: `Use this token to reset your password: ${token}`,
    });

    return ok({ sent: true }, "Reset instructions sent");
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepository.findOne({ where: { resetToken: dto.token } });
    if (!user) {
      throw new BadRequestException("Invalid reset token");
    }

    if (!user.resetTokenExpiresAt || user.resetTokenExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException("Reset token has expired");
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.resetToken = null;
    user.resetTokenExpiresAt = null;
    await this.userRepository.save(user);

    return ok({ reset: true }, "Password reset successful");
  }

  async me(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId }, relations: { employee: true } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    return ok(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        employee: user.employee
          ? {
              id: user.employee.id,
              employeeId: user.employee.employeeId,
              firstName: user.employee.firstName,
              lastName: user.employee.lastName,
            }
          : null,
      },
      "Profile fetched",
    );
  }
}
