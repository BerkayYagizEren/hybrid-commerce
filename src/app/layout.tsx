import type { Metadata } from "next";
import { Header } from "@/shared/layout/Header";
import { Footer } from "@/shared/layout/Footer";
import { RoleProvider } from "@/shared/providers/RoleContext";
import { FavoritesProvider } from "@/features/favorites/context/FavoritesContext";
import { getCurrentUser } from "@/features/auth/actions/auth.actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "HybridCommerce — Satın Al veya Kirala",
  description:
    "Hem ürün satışı hem de kiralama yapabileceğiniz hibrit e-ticaret platformu",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="tr">
      <body className="flex min-h-screen flex-col bg-gray-50 text-gray-900 antialiased">
        <RoleProvider initialUser={user}>
          <FavoritesProvider>
            <Header initialUser={user} />
            <main className="flex-1">{children}</main>
            <Footer />
          </FavoritesProvider>
        </RoleProvider>
      </body>
    </html>
  );
}
