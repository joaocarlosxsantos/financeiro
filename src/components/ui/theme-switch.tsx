import { useTheme } from "@/components/providers/theme-provider";

export function ThemeSwitch() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded border border-border bg-background text-foreground hover:bg-muted transition"
      aria-label="Alternar tema"
      type="button"
    >
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
}
