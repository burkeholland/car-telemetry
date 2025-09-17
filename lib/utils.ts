export function cn(...classes: any[]) {
  return classes
    .flat()
    .filter(Boolean)
    .join(" ");
}
