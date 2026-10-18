// Where this person is right now, so a toast is never shown for the room they are already standing in.
// Plain values read at the moment something arrives; nothing re-renders from them.
export const presence = {
  chatOpen: false,
  gameId: null as string | null,
};
