export type ProductStatus = 'active' | 'inactive';

export interface ProductCategoryEmbed {
  name: string;
  slug: string;
}

export interface ProductSubcategoryEmbed {
  name: string;
  slug: string;
}

export interface ProductBrandEmbed {
  name: string;
  slug: string;
}

/** Contrato del Producto tal y como lo devuelve GET /products (id en vez de _id, sin internals). */
export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  image: string | null;
  imageKey?: string | null;
  categoryId: string;
  subcategoryId?: string | null;
  category: ProductCategoryEmbed;
  subcategory?: ProductSubcategoryEmbed | null;
  brandId?: string;
  brand?: ProductBrandEmbed;
  unit?: string;
  unitQuantity?: number;
  status: ProductStatus;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payload de creación (POST /products).
 * `stock`/`minStock` solo aplican en create: el backend crea el inventario aquí.
 * El SKU se auto-genera en backend si se omite.
 * La imagen se adjunta DESPUÉS de crear el draft vía flujo presigned + imageKey,
 * por lo que no forma parte del payload de creación.
 */
export interface CreateProductPayload {
  name: string;
  price: number;
  categoryId: string;
  subcategoryId?: string | null;
  sku?: string;
  brandId?: string;
  unit?: string;
  unitQuantity?: number;
  description?: string;
  status?: ProductStatus;
  isAvailable?: boolean;
  stock?: number;
  minStock?: number;
}

/**
 * Payload de actualización (PATCH /products/:id). Partial.
 * `stock`/`minStock` NO se envían aquí: el inventario es gestionado por el
 * módulo de inventario (futuro). `brandId: null` limpia la marca del producto.
 * La imagen se gestiona por `imageKey` (nueva subida confirmada) o
 * `removeImage` (eliminar la imagen actual); nunca se envía `image` manual.
 */
export interface UpdateProductPayload {
  name?: string;
  price?: number;
  categoryId?: string;
  subcategoryId?: string | null;
  sku?: string;
  brandId?: string | null;
  unit?: string;
  unitQuantity?: number;
  description?: string;
  status?: ProductStatus;
  isAvailable?: boolean;
  imageKey?: string;
  removeImage?: boolean;
}
