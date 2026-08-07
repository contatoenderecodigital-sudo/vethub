/**
 * Wordmark VetHub: as duas partes juntas, sem espaço, em cores diferentes.
 * Sobre fundo escuro/verde: Vet branco + Hub verde claro.
 * Sobre fundo claro: Vet quase-preto + Hub verde.
 */
export function Wordmark({
  sobre = "escuro",
  className = "",
}: {
  sobre?: "escuro" | "claro";
  className?: string;
}) {
  const vet = sobre === "escuro" ? "text-white" : "text-ink";
  // Sobre o cabeçalho colorido o "Hub" usa a cor do tema CLAREADA
  // (--color-wordmark): a cor cheia não alcançava o contraste mínimo.
  const hub = sobre === "escuro" ? "text-[var(--color-wordmark)]" : "text-brand-mint";
  return (
    <span className={`wordmark select-none ${className}`}>
      <span className={vet}>Vet</span>
      <span className={hub}>Hub</span>
    </span>
  );
}
