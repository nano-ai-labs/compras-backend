import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt.guard";
import { GoogleLoginDto } from "./dto/google-login.dto"; // ✅ IMPORT NORMAL (NO type)

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("google")
  async google(@Body() dto: GoogleLoginDto) {
    return this.auth.loginWithGoogle(dto.idToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@Req() req: Request) {
    return { ok: true, user: (req as any).user };
  }
}
