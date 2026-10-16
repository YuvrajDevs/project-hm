import { useEffect } from "react";

// One shared page-scroll lock. Every pop-up or full-screen view takes a hold while it's open;
// the page only scrolls again once the last hold is released. Separate on/off switches used to
// undo each other (one closing would unlock the page under another still open), or never let go.
let holds = 0;

const take = () => {
  holds += 1;
  document.body.style.overflow = "hidden";
  return () => {
    holds = Math.max(0, holds - 1);
    if (holds === 0) document.body.style.overflow = "";
  };
};

export const useScrollLock = (active = true) => {
  useEffect(() => (active ? take() : undefined), [active]);
};
