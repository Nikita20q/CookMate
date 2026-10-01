export default function cn(
  ...args: (string | { [key: string]: boolean } | undefined)[]
) {
  const classList: string[] = [];
  args.forEach((item) => {
    if (typeof item === "string") {
      classList.push(item);
    }
    if (typeof item === "object") {
      Object.keys(item).forEach((key) => {
        if (item[key] == true) {
          classList.push(key);
        }
      });
    }
  });
  return classList.join(" ");
}
