import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductsServicesManager } from "@/components/local-business/ProductsServicesManager";

export const metadata = { title: "Products & Services — Local Business Studio" };

export default function LbProductsServicesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/grow/local-business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Local Business Studio</Link>
        <h1 className="mt-1 text-2xl font-bold">Products &amp; Services</h1>
        <p className="mt-1 text-muted-foreground">Organize your offerings. Use the Optimizer or Post Generator to write descriptions and promotion copy.</p>
      </div>
      <ProductsServicesManager />
    </div>
  );
}
