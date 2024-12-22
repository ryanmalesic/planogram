import { PlusIcon } from '@radix-ui/react-icons';
import { ChangeEvent, createRef, FormEvent, RefObject, useCallback, useEffect, useRef, useState } from 'react';

import Spinner from './components/spinner';
import { Card, CardHeader, CardTitle, CardDescription } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { ScrollArea, ScrollBar } from './components/ui/scroll-area';
import { useBook } from './hooks/use-book';
import { useToast } from './hooks/use-toast';
import { cn } from './lib/utils';

function App() {
  const [current, setCurrent] = useState(0);
  const [itemCode, setItemCode] = useState('');
  const [shelves, setShelves] = useState<string[][][]>([[]]);
  const shelfRefs = useRef<RefObject<HTMLDivElement>[]>([createRef()]);

  const { toast } = useToast();
  const { items, loading, load } = useBook();

  const currentShelf = shelves[current];
  useEffect(() => {
    console.log('scrolling', current);
    shelfRefs.current.at(current)?.current?.scrollTo({
      left: shelfRefs.current.at(current)?.current?.scrollWidth,
      behavior: 'smooth',
    });
  }, [currentShelf, current]);

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.item(0);
      if (!file) {
        return;
      }

      toast({
        title: 'Loading book',
        description: 'The book is being loaded',
      });

      let toasty = null;
      try {
        await load(file);
        toasty = toast({
          title: 'Book loaded',
          description: 'The book has been loaded successfully',
        });
      } catch {
        toasty = toast({
          title: 'Error loading book',
          description: 'There was an error loading the book',
          variant: 'destructive',
        });
      }

      setTimeout(() => {
        toasty.dismiss();
      }, 5000);
    },
    [load, toast]
  );

  const handleItemCodeSubmit = (e: FormEvent) => {
    e.preventDefault();

    const item = items[itemCode.trim().slice(0, 7)];
    if (item === undefined) {
      setItemCode('');
      return;
    }

    setShelves(prev => [...prev.slice(0, current), [...(prev.at(current) ?? []), item], ...prev.slice(current + 1)]);
    setItemCode('');
  };

  const handleAddShelfClick = () => {
    setShelves([...shelves, []]);
    setCurrent(shelves.length);
    shelfRefs.current.push(createRef<HTMLDivElement>());
  };

  const handleMissingItemsClick = () => {
    const itemCodes = new Set(
      shelves
        .filter(shelf => shelf.length > 0)
        .flat()
        .map(item => item[11])
    );

    const subClasses = new Set(
      shelves
        .filter(shelf => shelf.length > 0)
        .flat()
        .map(item => item[60])
    );

    const missingItemsInSubClasses = Object.values(items).filter(
      item => subClasses.has(item[60]) && !itemCodes.has(item[11])
    );

    const header = ['brand', 'name', 'pack', 'size', 'itemcode', 'restricted', 'upc', 'class', 'subclass'].join(',');

    const missingItemsInSubClassesCsv = `${header}\n${missingItemsInSubClasses
      .map(item => [item[5], item[6], item[7], item[8], item[11], item[12], item[20], item[58], item[60]].join(','))
      .join('\n')}`;

    const missingItemsInSubClassesData = new Blob([missingItemsInSubClassesCsv], {
      type: 'text/csv',
    });
    const missingItemsInSubClassesLink = document.createElement('a');
    missingItemsInSubClassesLink.setAttribute('download', `missing-items-in-sub-class-${new Date().toISOString()}.csv`);
    missingItemsInSubClassesLink.href = window.URL.createObjectURL(missingItemsInSubClassesData);
    missingItemsInSubClassesLink.click();
  };

  const handleSaveClick = () => {
    const csv = shelves
      .filter(shelf => shelf.length > 0)
      .reduce(
        (prev, curr) =>
          `${prev}${curr.map(c => `"${c[6]}\n${c[5]} (${c[7]}@${c[8]})\nSVC: ${c[11]}${c[12]}\nUPC: ${c[20]}${c[12]}"`).join(',')}\n`,
        ''
      );

    const data = new Blob([csv], {
      type: 'text/csv',
    });
    const link = document.createElement('a');
    link.setAttribute('download', `planogram-${new Date().toISOString()}.csv`);
    link.href = window.URL.createObjectURL(data);
    link.click();
  };

  return (
    <div className='flex max-h-svh min-h-svh min-w-full max-w-full flex-col overflow-hidden bg-slate-50'>
      <header className='flex items-center justify-between border-b border-input px-6 py-4'>
        <h1 className='text-xl font-semibold'>Planogrammer</h1>

        <div className='flex gap-4'>
          <form>
            <label
              htmlFor='book'
              className='sr-only cursor-pointer'
            >
              Choose file
            </label>
            <input
              type='file'
              accept='text/csv'
              disabled={loading}
              id='book'
              name='book'
              onChange={handleFileChange}
              className='flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:file:cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
            />
          </form>
          <Button
            type='button'
            disabled={loading || Object.keys(items).length === 0}
            variant='secondary'
            onClick={handleMissingItemsClick}
          >
            Missing Items
          </Button>
          <Button
            type='button'
            disabled={loading || Object.keys(items).length === 0}
            variant='default'
            onClick={handleSaveClick}
          >
            Save
          </Button>
        </div>
      </header>

      <main className='flex flex-1 flex-col gap-4 px-6 py-4'>
        <div className='max-w-fit'>
          <Label htmlFor='item-code'>Item Code</Label>
          <form
            className='flex items-center gap-2'
            onSubmit={handleItemCodeSubmit}
          >
            <div className='relative'>
              <Input
                type='text'
                disabled={loading || Object.keys(items).length === 0}
                id='item-code'
                inputMode='numeric'
                placeholder='1234567'
                required
                tabIndex={1}
                value={itemCode}
                onChange={e => {
                  setItemCode(e.target.value);
                }}
              />
              <Button
                type='submit'
                disabled={loading || Object.keys(items).length === 0}
                tabIndex={2}
                variant='ghost'
                className='absolute right-0 top-0 z-10 border-l border-input focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
              >
                {!loading ? <PlusIcon className='h-4 w-4' /> : <Spinner />}
              </Button>
            </div>
          </form>
        </div>

        {Object.entries(items).length === 0 && !loading && (
          <div className='flex w-full flex-1 items-center justify-center border border-dashed border-input text-lg font-medium'>
            <h2>Please upload a price book to get started</h2>
          </div>
        )}

        {Object.entries(items).length === 0 && loading && (
          <div className='flex w-full flex-1 items-center justify-center border border-dashed border-input text-lg font-medium'>
            <Spinner />
          </div>
        )}

        {Object.entries(items).length > 0 && (
          <div className='overflow-scroll'>
            {shelves.map((level, levelIndex) => (
              <ScrollArea
                key={levelIndex}
                ref={shelfRefs.current[levelIndex]}
                onClick={() => setCurrent(levelIndex)}
                className={cn('h-fit min-h-[166px] whitespace-nowrap border border-input p-4 first:rounded-t', {
                  'border-blue-400': current === levelIndex,
                })}
              >
                <div className='flex h-full w-max space-x-4 p-0'>
                  {level.map((item, shelvesIndex) => (
                    <Card
                      className={cn('min-w-64 max-w-64 whitespace-break-spaces', {
                        'bg-red-100': item[12] === '*',
                      })}
                      key={`${item[11]}_${shelvesIndex}`}
                    >
                      <CardHeader>
                        <CardTitle>{item[6]}</CardTitle>
                        <CardDescription>
                          <span className='block'>
                            {item[5]} ({item[7]}@{item[8]})
                          </span>
                          <span className='block'>SVC: {item[11]}</span>
                          <span className='block'>UPC: {item[20]}</span>
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
                <ScrollBar orientation='horizontal' />
              </ScrollArea>
            ))}

            <div className='mt-4 flex items-center justify-end'>
              <Button
                tabIndex={3}
                variant='default'
                onClick={handleAddShelfClick}
              >
                Add Shelf
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
