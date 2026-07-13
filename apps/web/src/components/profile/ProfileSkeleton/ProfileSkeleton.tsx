import { SidebarRail, MainColumn } from './ProfileSkeleton.parts';

/**
 * Loading placeholder for the Profile view. Mirrors the real dashboard layout —
 * a 280px sidebar rail (round avatar + summary tiles + actions) beside a main
 * column (4-up stat grid, status rings, breakdown bars) — so the transition into
 * the loaded view doesn't reflow.
 */
export default function ProfileSkeleton() {
  return (
    <div aria-busy="true" className="flex-1 flex min-h-0">
      <SidebarRail />
      <MainColumn />
    </div>
  );
}
