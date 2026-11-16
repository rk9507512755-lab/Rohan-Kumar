export default function Loading() {
  return (
    <div className="container-site py-16" aria-busy="true" aria-label="Loading">
      <div className="mx-auto h-8 w-56 animate-pulse bg-ivory-200" />
      <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => <div key={i}><div className="aspect-[4/5] animate-pulse bg-ivory-200" /><div className="mt-3 h-3 w-2/3 animate-pulse bg-ivory-200" /><div className="mt-2 h-3 w-1/3 animate-pulse bg-ivory-200" /></div>)}
      </div>
    </div>
  );
}
