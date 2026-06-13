import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'super-secret-key', // Match the secret in AuthModule
    });
  }

  validate(payload: any) {
    return {
      userId: payload.sub,
      email: payload.email,
      schema: payload.schema,
      role: payload.role,
      profileId: payload.profileId,
    };
  }
}
