import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import config from '../config/env';
import { AppError } from './AppError';

export interface TokenPayload {
  userId: string;
  role: string;
  email: string;
}

export interface DecodedToken extends TokenPayload, JwtPayload {}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
}

export function verifyAccessToken(token: string): DecodedToken {
  try {
    return jwt.verify(token, config.JWT_ACCESS_SECRET) as DecodedToken;
  } catch {
    throw AppError.unauthorized('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): DecodedToken {
  try {
    return jwt.verify(token, config.JWT_REFRESH_SECRET) as DecodedToken;
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }
}

export function generateTokenPair(payload: TokenPayload): {
  accessToken: string;
  refreshToken: string;
} {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

export function getRefreshTokenExpiryDate(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return expiresAt;
}
