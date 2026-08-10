/**
 * Wordmark VetHub: as duas partes juntas, sem espaço, em cores diferentes.
 * Sobre fundo escuro/verde: Vet branco + Hub verde claro.
 * Sobre fundo claro: Vet quase-preto + Hub verde.
 */
export function Wordmark({
  sobre = "escuro",
  className = "",
}: {
  /**
   * Em que tipo de fundo a marca vai pousar.
   *
   * `auto` é para o fundo que ACOMPANHA o tema — as telas de entrar,
   * cadastrar e recuperar senha, que ficam verdes no modo escuro e claras no
   * modo claro. Fixar "escuro" nelas deixava o logotipo branco sobre fundo
   * claro em 1,03:1: invisível para quem escolheu o tema claro e depois
   * deslogou. Ninguém tinha visto porque a auditoria entra logada, e o proxy
   * desvia quem já tem sessão dessas telas.
   */
  sobre?: "escuro" | "claro" | "auto";
  className?: string;
}) {
  const automatico = sobre === "auto";
  const vet = automatico ? "wm-vet" : sobre === "escuro" ? "text-white" : "text-ink";
  // Sobre o cabeçalho colorido o "Hub" usa a cor do tema CLAREADA
  // (--color-wordmark): a cor cheia não alcançava o contraste mínimo.
  const hub = automatico
    ? "wm-hub"
    : sobre === "escuro"
      ? "text-[var(--color-wordmark)]"
      : "text-brand-mint";
  return (
    <span className={`wordmark select-none ${className}`}>
      <span className={vet}>Vet</span>
      <span className={hub}>Hub</span>
    </span>
  );
}
