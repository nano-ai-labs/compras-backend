export function buildMeta(page: number, limit: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // ✅ compat: algunos front usan meta.pages
  return {
    page,
    limit,
    total,
    totalPages,
    pages: totalPages,
  };
}
