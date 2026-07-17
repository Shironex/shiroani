import { useDiscoverSkeleton } from './DiscoverSkeleton.hooks';
import { SkeletonCards } from './DiscoverSkeleton.parts';

export default function DiscoverSkeleton() {
  useDiscoverSkeleton();

  return (
    <div
      aria-busy="true"
      className="grid gap-3.5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6"
    >
      <SkeletonCards />
    </div>
  );
}
