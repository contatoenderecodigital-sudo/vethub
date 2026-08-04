import { ListaContas, type FiltrosContas } from "../lista-contas";

export const metadata = { title: "Contas a receber" };

export default async function ContasReceberPage({
  searchParams,
}: {
  searchParams: Promise<FiltrosContas>;
}) {
  return <ListaContas tipo="receber" filtros={await searchParams} />;
}
