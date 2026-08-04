import { ListaContas, type FiltrosContas } from "../lista-contas";

export const metadata = { title: "Contas a pagar" };

export default async function ContasPagarPage({
  searchParams,
}: {
  searchParams: Promise<FiltrosContas>;
}) {
  return <ListaContas tipo="pagar" filtros={await searchParams} />;
}
