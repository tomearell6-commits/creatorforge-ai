import { AdminTutorials } from "@/components/admin/AdminTutorials";
import { AvatarTutorialGenerator } from "@/components/admin/AvatarTutorialGenerator";

export default function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tutorials</h1>
      <AvatarTutorialGenerator />
      <AdminTutorials />
    </div>
  );
}
