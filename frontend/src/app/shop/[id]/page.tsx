import ProductDetailClient from './ProductDetailClient';

// Static IDs for demo products — add more as the store grows
export async function generateStaticParams() {
  return ['1', '2', '3'].map(id => ({ id }));
}

export default function Page({ params }: { params: { id: string } }) {
  return <ProductDetailClient id={params.id} />;
}
