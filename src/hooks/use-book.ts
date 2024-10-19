import { useState } from 'react';

function parseLine(line: string, ids: Set<string>) {
  const parts = line.split(',');

  if (ids.has(parts[11]) || ids.has(parts[20])) return null;
  ids.add(parts[11]);
  ids.add(parts[20]);

  return parts.slice(0, -1).map(part => part.trim().toLocaleLowerCase().replace(/\s+/, ' ').replace('"', ''));
}

export const useBook = () => {
  const [items, setItems] = useState<{ [key: string]: string[] }>({});
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      setItems({});
      setError(false);
      setLoading(true);

      const reader = new FileReader();

      reader.onload = () => {
        const text = reader.result;
        if (!text) return;

        const ids: Set<string> = new Set();

        try {
          const items = text
            .toString()
            .split('\n')
            .slice(3)
            .map(line => parseLine(line, ids))
            .filter(item => !!item)
            .reduce<{ [key: string]: string[] }>((acc, item) => {
              if (item.length < 11) return acc;
              acc[item[11]] = item;
              return acc;
            }, {});

          setItems(items);
          resolve();
        } catch (err) {
          console.error(err);
          setError(true);
          reject();
        } finally {
          setLoading(false);
        }
      };

      reader.onerror = () => {
        console.error('reader.onerror');
        setError(true);
        setLoading(false);
        reject();
      };

      reader.readAsText(file);
    });
  };

  return { items, error, loading, load };
};
