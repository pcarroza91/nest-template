import { PaginationMeta } from '../interfaces/pagination-meta.interface';

export class PaginatedResultDto<T> {
  readonly items: T[];
  readonly meta: PaginationMeta;

  constructor(items: T[], totalItems: number, page: number, limit: number) {
    const safeLimit = limit > 0 ? limit : 1;
    const totalPages = Math.ceil(totalItems / safeLimit);

    this.items = items;
    this.meta = {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1 && totalItems > 0,
    };
  }

  map<U>(fn: (item: T, index: number) => U): PaginatedResultDto<U> {
    const mapped = new PaginatedResultDto<U>(
      this.items.map(fn),
      this.meta.totalItems,
      this.meta.page,
      this.meta.limit,
    );
    return mapped;
  }

  static empty<T>(page = 1, limit = 10): PaginatedResultDto<T> {
    return new PaginatedResultDto<T>([], 0, page, limit);
  }
}
