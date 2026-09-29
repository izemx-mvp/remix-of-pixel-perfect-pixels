import { createFileRoute } from "@tanstack/react-router";
import { UsersPanel } from "@/components/AdminPanels";

export const Route = createFileRoute("/sinophra/utilisateurs")({
  head: () => ({
    meta: [
      { title: "Utilisateurs — SINOPHRA" },
      { name: "description", content: "Comptes et rôles de l'équipe SINOPHRA." },
      { property: "og:title", content: "Utilisateurs — SINOPHRA" },
      { property: "og:description", content: "Gestion des utilisateurs et des rôles SINOPHRA." },
    ],
  }),
  component: () => (
    <UsersPanel
      roles={["Administrateur SINOPHRA", "Responsable Stock", "Responsable Commercial", "Responsable SAV"]}
      initial={[
        ["Yassine Berrada", "Administrateur SINOPHRA", "y.berrada@sinophra.ma"],
        ["Imane Tazi", "Responsable Stock", "i.tazi@sinophra.ma"],
        ["Mehdi Naciri", "Responsable Commercial", "m.naciri@sinophra.ma"],
        ["Sofia Kabbaj", "Responsable SAV", "s.kabbaj@sinophra.ma"],
      ]}
    />
  ),
});
