import { useMemo, useState } from 'react';
import { PRICE_CATALOG } from '../data/priceCatalog';
import type { PriceItem } from '../types';
import { normalizeText } from '../lib/helpers';

type Props = {
  value: string;
  onSelect: (item: PriceItem) => void;
  onQueryChange: (text: string) => void;
};

// Esta é a lista pesquisável solicitada: qualquer trecho digitado é procurado em toda a descrição.
// Ex.: digitando "rocha" aparecem todos os serviços que contêm essa palavra, mesmo no meio do texto.
export function ServiceSearch({ value, onSelect, onQueryChange }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = normalizeText(query.trim());
    const rows = q ? PRICE_CATALOG.filter((x) => normalizeText(x.descricao).includes(q)) : PRICE_CATALOG;
    return rows.slice(0, 50);
  }, [query]);

  const choose = (item: PriceItem) => {
    setQuery(item.descricao);
    setOpen(false);
    onSelect(item);
  };

  return (
    <div className="service-search">
      <input
        value={query}
        placeholder="Digite qualquer parte do serviço..."
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          const text = e.target.value;
          setQuery(text);
          setOpen(true);
          // Enquanto o usuário pesquisa, limpamos os campos automáticos no componente pai.
          // Eles só voltam a ser preenchidos quando uma opção real do catálogo for escolhida.
          onQueryChange(text);
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div className="service-menu">
          {results.length ? results.map((item) => (
            <button type="button" key={`${item.descricao}-${item.preco}`} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(item)}>
              <strong>{item.descricao}</strong>
              <small>Preço {item.preco} · {item.unid} · {item.precoUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</small>
            </button>
          )) : <div className="service-empty">Nenhum serviço encontrado.</div>}
        </div>
      )}
    </div>
  );
}
