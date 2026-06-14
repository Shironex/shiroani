/** The up-to-two tag chips rendered in the card footer. */
export function CardTags({ tags }: { tags: string[] }) {
  return (
    <>
      {tags.map(tag => (
        <span
          key={tag}
          className="px-1.5 py-0.5 rounded-full text-2xs bg-primary/10 text-primary/70"
        >
          {tag}
        </span>
      ))}
    </>
  );
}
