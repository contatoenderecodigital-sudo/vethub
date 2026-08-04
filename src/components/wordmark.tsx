/**
 * Wordmark VetHub — as duas partes juntas, sem espaço, em cores diferentes.
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
  const hub = sobre === "escuro" ? "text-brand-light" : "text-brand";
  return (
    <span className={`wordmark select-none ${className}`}>
      <span className={vet}>Vet</span>
      <span className={hub}>Hub</span>
    </span>
  );
}
