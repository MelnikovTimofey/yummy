import { lineLabel } from '@/lib/tobacco-line';

type BrandTobacco = { manufacturer: string; lineName?: string };

// Подпись под названием (#624): «Sebero, Black»; без линейки — только бренд.
export const ShelfBrand = ({ tobacco }: { tobacco: BrandTobacco }) => {
  const line = lineLabel(tobacco.manufacturer, tobacco.lineName);
  return (
    <>
      {tobacco.manufacturer}
      {line ? (
        <>
          , <em className="shelf-line">{line}</em>
        </>
      ) : null}
    </>
  );
};

// Однострочное имя в таблицах «К заказу» и плана: «Sebero Black Strawberry».
export const ShelfOneLineName = ({ tobacco }: { tobacco: BrandTobacco & { name: string } }) => {
  const line = lineLabel(tobacco.manufacturer, tobacco.lineName);
  return (
    <>
      {tobacco.manufacturer} {line ? <em className="shelf-line">{line}</em> : null}
      {line ? ' ' : null}
      {tobacco.name}
    </>
  );
};
