import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Cache de navegação no cliente: voltar para uma página visitada nos
    // últimos 30s é instantâneo. Mutações continuam atualizando na hora
    // (server actions fazem revalidatePath).
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
