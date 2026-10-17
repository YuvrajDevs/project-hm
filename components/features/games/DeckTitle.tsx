import React from "react";

const SPICY = "\u{1F336}\uFE0F";

// A deck's title, with the chili emoji in the spicier ones swapped for the pixel chili
export const DeckTitle = ({ title }: { title: string }) => {
  const parts = title.split(SPICY);
  if (parts.length === 1) return <>{title}</>;
  return (
    <>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/icons/marker_after_dark.png" alt="after dark" className="inline-block w-[1.1em] h-[1.1em] align-[-0.2em] ml-1 object-contain" draggable={false} />
          )}
        </React.Fragment>
      ))}
    </>
  );
};
