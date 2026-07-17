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
          className="inline-flex items-center px-2 py-[3px] rounded-full font-mono text-[10px] uppercase tracking-[0.08em] font-semibold bg-primary/15 text-primary border border-primary/40"
        >
          {g}
        </span>
      ))}
    </div>
  );
}
