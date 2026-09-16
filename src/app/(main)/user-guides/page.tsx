import { redirect } from "next/navigation";

export default function UserGuidesRedirect() {
  redirect("/blog?category=user-guides");
}
