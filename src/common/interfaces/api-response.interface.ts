import { PaginationMeta } from './pagination-meta.interface';

export interface ApiResponseError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

export interface ApiResponseMeta {
  timestamp: string;
  path: string;
  pagination?: PaginationMeta;
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
  meta: ApiResponseMeta;
  errors: ApiResponseError[] | null;
}
