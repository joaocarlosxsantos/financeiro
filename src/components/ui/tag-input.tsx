import { useState } from "react";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ value, onChange, placeholder }: TagInputProps) {
  const [input, setInput] = useState("");

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      addTag(input);
      setInput("");
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 border border-input bg-background rounded-md px-2 py-1 min-h-[42px]">
      {value.map((tag) => (
        <span key={tag} className="flex items-center gap-1 bg-primary text-primary-foreground rounded px-2 py-0.5 text-xs">
          {tag}
          <button type="button" onClick={() => removeTag(tag)} className="ml-1 text-xs hover:text-red-400">×</button>
        </span>
      ))}
      <input
        className="flex-1 min-w-[80px] bg-transparent outline-none text-foreground"
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Adicionar tag"}
      />
    </div>
  );
}
