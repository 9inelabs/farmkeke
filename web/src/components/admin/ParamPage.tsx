// Reads one dynamic route param inside a Suspense boundary (Cache
// Components: params are request data) and hands it to a client view.
import { Suspense, type ReactNode } from "react";

export function ParamPage<K extends string>({
  params,
  name,
  fallback,
  render,
}: {
  params: Promise<Record<K, string>>;
  name: K;
  fallback: ReactNode;
  render: (value: string) => ReactNode;
}) {
  return (
    <Suspense fallback={fallback}>
      <Inner params={params} name={name} render={render} />
    </Suspense>
  );
}

async function Inner<K extends string>({
  params,
  name,
  render,
}: {
  params: Promise<Record<K, string>>;
  name: K;
  render: (value: string) => ReactNode;
}) {
  const p = await params;
  return render(decodeURIComponent(p[name]));
}
