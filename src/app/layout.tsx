import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "VetHub",
    template: "%s · VetHub",
  },
  description:
    "A central que junta agenda, prontuário, internação e estoque em um só lugar.",
};

export const viewport: Viewport = {
  themeColor: "#047857",
};

/**
 * Aplica o tema salvo antes da primeira pintura. Sem isso a tela
 * aparece verde por um instante e depois muda de cor.
 */
const APLICAR_TEMA = `try{var t=localStorage.getItem("vethub:tema");if(t)document.documentElement.dataset.tema=t}catch(e){}`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Nonce gerado pelo proxy para o script inline passar na CSP
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: APLICAR_TEMA }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
