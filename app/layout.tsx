import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniOrder Lab | Comercio omnicanal",
  description: "Laboratorio de pedidos omnicanal con operación y facturación trazables.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
