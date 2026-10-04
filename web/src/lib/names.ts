/** "Kofi", "Kofi and Efua", "Kofi, Efua and Yaw". Unnamed people read as "your teammate". */
export function listNames(names: string[]): string {
  const shown = names.map((n) => (n === "Participant" ? "your teammate" : n));
  return shown.length < 2 ? shown.join("") : `${shown.slice(0, -1).join(", ")} and ${shown.at(-1)}`;
}
