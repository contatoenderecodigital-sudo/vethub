import { redirect } from "next/navigation";

// O proxy já redireciona "/" para /dashboard (logado) ou /login.
export default function Home() {
  redirect("/login");
}
