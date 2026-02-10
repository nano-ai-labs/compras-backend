import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';

function decodeJwtPayload(token: string) {
  const parts = token.split('.');
  if (parts.length < 2) return null;

  // base64url -> base64
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

  try {
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

@Injectable()
export class AuthService {
  private client: OAuth2Client;
  private readonly clientId: string;
  private readonly allowedAudiences: string[];

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) throw new Error('Missing GOOGLE_CLIENT_ID');

    // ✅ guarda el principal
    this.clientId = clientId;

    // ✅ opcional: permite un segundo Client ID si lo tienes (Android/iOS u otro)
    const clientId2 = this.config.get<string>('GOOGLE_CLIENT_ID_2');

    this.allowedAudiences = [clientId, clientId2].filter(Boolean) as string[];

    this.client = new OAuth2Client(clientId);
  }

  
  async loginWithGoogle(idToken: string) {
    // ✅ DEBUG: ver qué trae el token realmente
    const decoded = decodeJwtPayload(idToken);
    console.log('🔎 Google idToken aud:', decoded?.aud);
    console.log('🔎 Google idToken azp:', decoded?.azp);
    console.log('🔎 Allowed audiences:', this.allowedAudiences);

    console.log("BACKEND GOOGLE_CLIENT_ID (process.env):", process.env.GOOGLE_CLIENT_ID);
    console.log("BACKEND GOOGLE_CLIENT_ID (config):", this.config.get<string>('GOOGLE_CLIENT_ID'));

    // ✅ Verifica contra uno o varios client IDs
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: this.allowedAudiences,
    });

    const payload = ticket.getPayload();

    if (!payload?.email) throw new UnauthorizedException('Invalid Google token');
    if (payload.email_verified === false) throw new UnauthorizedException('Google email not verified');

    const email = payload.email.toLowerCase();
    const googleId = payload.sub;
    const fullName = payload.name ?? null;

    const user = await this.prisma.user.upsert({
      where: { email },
      create: {
        email,
        googleId,
        fullName,
        role: 'CLIENT',
        isGlobalAdmin: false,
      },
      update: {
        googleId,
        fullName,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isGlobalAdmin: true,
        createdAt: true,
      },
    });

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      isGlobalAdmin: user.isGlobalAdmin,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN') || '120h',
      user,
    };
  }
}
