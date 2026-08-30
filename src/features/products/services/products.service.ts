import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseApiService } from '@core/http/services/base-api.service';
import { API_ENDPOINTS } from '@core/http/endpoints';
import type { PaginatedResponse } from '@core/models/paginated-response';

import type { CreateProductPayload, Product, UpdateProductPayload } from '../models/product.model';
import type { ProductsQuery } from '../models/products-query';

export interface PresignedUpload {
  uploadUrl: string;
  publicUrl: string;
  expiresInSeconds: number;
  key: string;
  productId: string;
  purpose: string;
}

@Injectable({ providedIn: 'root' })
export class ProductsService extends BaseApiService {
  list(
    query: ProductsQuery,
    options: { skipLoading?: boolean } = {},
  ): Observable<PaginatedResponse<Product[]>> {
    return this.getPaginated<Product[]>(API_ENDPOINTS.adminProducts, {
      params: this.toParams(query),
      skipLoading: options.skipLoading,
    });
  }

  getById(id: string): Observable<Product> {
    return this.get<Product>(`${API_ENDPOINTS.adminProducts}/${id}`);
  }

  create(payload: CreateProductPayload): Observable<Product> {
    return this.post<Product>(API_ENDPOINTS.products, payload);
  }

  update(id: string, payload: UpdateProductPayload): Observable<Product> {
    return this.patch<Product>(`${API_ENDPOINTS.adminProducts}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.delete<void>(`${API_ENDPOINTS.products}/${id}`);
  }

  requestPresignedUpload(payload: {
    fileName: string;
    contentType: string;
    productId: string;
  }): Observable<PresignedUpload> {
    return this.post<PresignedUpload>(API_ENDPOINTS.adminUploadsPresigned, payload);
  }

  uploadFile(uploadUrl: string, file: File): Observable<void> {
    return this.put<void>(uploadUrl, file, {
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      timeoutMs: 30_000,
      skipAuth: true,
      skipLoading: true,
    });
  }

  private toParams(query: ProductsQuery): Record<string, string | number> {
    const params: Record<string, string | number> = {
      page: query.page,
      limit: query.limit,
    };
    if (query.q) params['q'] = query.q;
    if (query.category) params['category'] = query.category;
    if (query.categoryId) params['categoryId'] = query.categoryId;
    if (query.subcategoryId) params['subcategoryId'] = query.subcategoryId;
    if (query.brand) params['brand'] = query.brand;
    if (query.status) params['status'] = query.status;
    if (query.sortBy) params['sortBy'] = query.sortBy;
    if (query.sortOrder) params['sortOrder'] = query.sortOrder;
    return params;
  }
}
