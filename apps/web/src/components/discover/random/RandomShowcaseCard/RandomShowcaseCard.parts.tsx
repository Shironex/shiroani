interface IGenreTagsProps {
  genres: string[];
}

/** The accent-styled genre chips shown beneath the showcase meta row. */
export function GenreTags({ genres }: IGenreTagsProps) {
  return (
    <div className="mt-3 flex flex-wrap gap-1">
      {genres.map(g => (
        <span
          key={g}
          className="inline-flex items-center px-2 py-[3px] rounded-full text-[10px] font-medium bg-primary/10 text-primary/90 border border-primary/20"
        >
          {g}
        </span>
      ))}
    </div>
  );
}
