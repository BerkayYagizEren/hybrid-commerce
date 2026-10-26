export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-gray-500">
            © 2026 HybridCommerce. Tüm hakları saklıdır.
          </p>
          <div className="flex gap-6">
            <span className="text-xs text-gray-400">
              Next.js • Prisma • PostgreSQL • Tailwind CSS
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
