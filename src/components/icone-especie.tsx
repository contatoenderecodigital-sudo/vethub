import {
  Bird,
  Cat,
  Dog,
  PawPrint,
  Rabbit,
  Rat,
  Turtle,
} from "lucide-react";

function iconeDa(especie: string | null | undefined, className: string) {
  const props = { className, strokeWidth: 1.8 };
  switch ((especie ?? "").toLowerCase()) {
    case "cachorro":
      return <Dog {...props} />;
    case "gato":
      return <Cat {...props} />;
    case "ave":
      return <Bird {...props} />;
    case "réptil":
    case "reptil":
      return <Turtle {...props} />;
    case "roedor":
      return <Rat {...props} />;
    case "coelho":
      return <Rabbit {...props} />;
    default:
      return <PawPrint {...props} />;
  }
}

/** Ícone da espécie do pet num círculo verde-menta (Lucide). */
export function IconeEspecie({
  especie,
  tamanho = "md",
}: {
  especie: string | null | undefined;
  tamanho?: "sm" | "md" | "lg";
}) {
  const caixa =
    tamanho === "lg" ? "size-12" : tamanho === "sm" ? "size-8" : "size-10";
  const icone =
    tamanho === "lg" ? "size-6" : tamanho === "sm" ? "size-4" : "size-5";
  return (
    <span
      className={`flex ${caixa} shrink-0 items-center justify-center rounded-full bg-white/20 text-white`}
      aria-hidden
    >
      {iconeDa(especie, icone)}
    </span>
  );
}
