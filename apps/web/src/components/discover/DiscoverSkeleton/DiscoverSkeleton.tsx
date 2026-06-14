import { useDiscoverSkeleton } from './DiscoverSkeleton.hooks';
import { SkeletonCards } from './DiscoverSkeleton.parts';

export default function DiscoverSkeleton() {
  useDiscoverSkeleton();

  return (
    <div
      aria-busy="true"
      className="grid gap-3.5 grid-cols-[repeat(auto-fill,minmax(130px,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(140px,1fr))]"
    >
      <SkeletonCards />
    </div>
  );
}
