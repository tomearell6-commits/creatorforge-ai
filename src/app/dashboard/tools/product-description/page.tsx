import { TextToolPanel } from "@/components/dashboard/TextToolPanel";
export const metadata = { title: "Product Description Generator" };
export default function Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="text-2xl font-bold">Product Description Generator</h1><p className="mt-1 text-muted-foreground">Persuasive product descriptions for ecommerce and marketplaces.</p></div>
      <TextToolPanel tool="product-description" inputLabel="Product name / details" placeholder="e.g. grain-free puppy food, salmon" buttonLabel="Generate descriptions" />
    </div>
  );
}
