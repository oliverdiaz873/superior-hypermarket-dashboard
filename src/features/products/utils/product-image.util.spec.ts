import { resolveDashboardImageUrl } from './product-image.util';

describe('resolveDashboardImageUrl', () => {
  it('null -> null', () => {
    expect(resolveDashboardImageUrl(null)).toBeNull();
    expect(resolveDashboardImageUrl(undefined)).toBeNull();
    expect(resolveDashboardImageUrl('')).toBeNull();
  });

  it('/uploads/... permanece relativa', () => {
    expect(resolveDashboardImageUrl('/uploads/products/p1/image.webp')).toBe(
      '/uploads/products/p1/image.webp',
    );
  });

  it('/uploads/... con cache bust preserva query', () => {
    expect(
      resolveDashboardImageUrl('/uploads/products/p1/image.webp?v=2026-01-01T00:00:00.000Z'),
    ).toBe('/uploads/products/p1/image.webp?v=2026-01-01T00:00:00.000Z');
  });

  it('http:// permanece sin modificar', () => {
    expect(resolveDashboardImageUrl('http://localhost:3000/uploads/products/p1/image.webp')).toBe(
      'http://localhost:3000/uploads/products/p1/image.webp',
    );
  });

  it('https:// permanece sin modificar', () => {
    expect(resolveDashboardImageUrl('https://cdn.example.com/products/p1.webp')).toBe(
      'https://cdn.example.com/products/p1.webp',
    );
  });

  it('storage key products/... -> /uploads/products/...', () => {
    expect(resolveDashboardImageUrl('products/p1/image.webp')).toBe(
      '/uploads/products/p1/image.webp',
    );
  });

  it('nunca genera /uploads/uploads/...', () => {
    expect(resolveDashboardImageUrl('/uploads/products/p1/image.webp')).not.toContain(
      '/uploads/uploads/',
    );
    expect(resolveDashboardImageUrl('products/p1/image.webp')).not.toContain('/uploads/uploads/');
  });
});
