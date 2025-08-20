
import React from 'react';

export type Tag = {
  id: string;
  name: string;
};

type TagSelectorProps = {
  tags: Tag[];
  value: string;
  onChange: (selected: string) => void;
  label?: string;
  disabled?: boolean;
};

export const TagSelector: React.FC<TagSelectorProps> = ({ tags, value, onChange, label, disabled }) => {
  return (
    <div>
      {label && <label className="block mb-1 text-xs sm:text-sm font-medium">{label}</label>}
      <select
        id="tags"
        className="flex h-9 sm:h-10 w-full rounded-md border border-input bg-background px-2 sm:px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">Sem tag</option>
        {tags.map(tag => (
          <option key={tag.id} value={tag.id}>
            {tag.name}
          </option>
        ))}
      </select>
    </div>
  );
};
