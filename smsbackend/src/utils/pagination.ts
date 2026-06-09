import { Request } from 'express';

export interface PaginationOptions {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export function getPaginationOptions(req: Request): PaginationOptions {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;
  const sortBy = (req.query.sortBy as string) || 'createdAt';
  const sortOrder: 'asc' | 'desc' =
    (req.query.sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';

  return { page, limit, skip, sortBy, sortOrder };
}

export function buildSearchFilter(
  search: string | undefined,
  fields: string[]
): Record<string, unknown>[] | undefined {
  if (!search) return undefined;
  return fields.map((field) => ({
    [field]: { contains: search, mode: 'insensitive' },
  }));
}
