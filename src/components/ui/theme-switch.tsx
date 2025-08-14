import { useTheme } from "@/components/providers/theme-provider";
import { useEffect, useState } from "react";

export function ThemeSwitch() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded border border-border bg-background text-foreground hover:bg-muted transition"
      aria-label="Alternar tema"
      type="button"
    >
      {mounted ? (theme === "dark" ? "🌙" : "☀️") : null}
    </button>
  );
}
