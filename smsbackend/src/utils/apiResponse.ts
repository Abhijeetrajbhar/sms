import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponseOptions {
  message?: string;
  data?: unknown;
  meta?: PaginationMeta;
  statusCode?: number;
}

export class ApiResponse {
  static success(
    res: Response,
    options: ApiResponseOptions = {}
  ): Response {
    const { message = 'Success', data, meta, statusCode = 200 } = options;

    return res.status(statusCode).json({
      success: true,
      message,
      ...(data !== undefined && { data }),
      ...(meta && { meta }),
      error: null,
    });
  }

  static created(
    res: Response,
    options: ApiResponseOptions = {}
  ): Response {
    return ApiResponse.success(res, { statusCode: 201, ...options });
  }

  static error(
    res: Response,
    message: string,
    statusCode = 500,
    errors?: unknown
  ): Response {
    return res.status(statusCode).json({
      success: false,
      message,
      data: null,
      error: errors ?? { message },
      ...(errors !== undefined && { errors }),
    });
  }
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
