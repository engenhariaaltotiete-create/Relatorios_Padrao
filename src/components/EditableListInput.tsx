import { useMemo, useState } from 'react';
import { normalizeText } from '../lib/helpers';

type Props = {
  label: string;
  value: string;
  options: readonly string[];
  required?: boolean;
  placeholder?: string;
  allowCustom?: boolean;
  onChange: (value: string) => void;
};

// Lista inteligente: pesquisa qualquer trecho do texto, e não apenas o começo da opção.
// Por padrão permite valor novo; quando allowCustom=false, o usuário deve escolher uma opção da lista.
export function EditableListInput({ label, value, options, required, placeholder, allowCustom = true, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const q = normalizeText(value.trim());
    return (q ? options.filter((o) => normalizeText(o).includes(q)) : [...options]).slice(0, 60);
  }, [options, value]);

  return (
    <label className="field smart-list-field">
      <span>{label}{required && <b className="required"> *</b>}</span>
      <div className="smart-list">
        <input
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          required={required}
          onFocus={() => setOpen(true)}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onBlur={() => window.setTimeout(() => {
            setOpen(false);
            if (!allowCustom && value && !options.some((o) => normalizeText(o) === normalizeText(value))) onChange('');
          }, 160)}
        />
        {open && (
          <div className="service-menu smart-menu">
            {filtered.length ? filtered.map((o) => (
              <button key={o} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(o); setOpen(false); }}>{o}</button>
            )) : <div className="service-empty">{allowCustom ? 'Nenhuma opção existente. O valor digitado será aceito.' : 'Nenhuma opção encontrada.'}</div>}
          </div>
        )}
      </div>
    </label>
  );
}
