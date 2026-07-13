import { PillTag } from '@/components/ui/pill-tag';

/** The up-to-two tag chips rendered in the card footer. */
export function CardTags({ tags }: { tags: string[] }) {
  return (
    <>
      {tags.map(tag => (
        <PillTag key={tag} variant="muted">
          #{tag}
        </PillTag>
      ))}
    </>
  );
}
