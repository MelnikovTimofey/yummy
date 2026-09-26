# Пул миксов Арома Ателье

Источник миксов для редакторских рейлов (`preset-rails.md`) и каталога.
Собран 2026-09-25 из публичных каталогов миксов и подборок магазинов
(hookahportal.ru, hookahhouse.ru, nn-kalyan.ru, alphahookah.ru,
premium-tabak.com, store.allkalyans.com, 4kalyans.ru, kalyan-hut.ru).
Статистики «Покурить» и оценок на проде пока нет, поэтому спрос оценён по
внешним сигналам: пометка «Хит», повторы в нескольких подборках, топы брендов.
htreviews.org не используется: его robots.txt закрыт для Claude.

Два набора:

- **Хиты** — то, что востребовано. Порядок строк — от сильного сигнала спроса
  к слабому, и в этом же порядке миксы стоят в рейлах.
- **Ниша** — сложные сочетания и крафтовые бренды для ценителей: табачная и
  крепкая база, чай, пряности, травы и хвоя, цветы, гастро.

## Формат

- Состав — `производитель / линейка / название NN%` через « · », написание
  точно как в каталоге `Tobacco` (`manufacturer` / `lineName` / `name`; пустая
  линейка — `—`). Сумма долей — 100%.
- В микс берётся только актуальный табак: «Выпускается» и в наличии. Если
  табак сняли или он закончился, `build:catalog` пропустит микс и назовёт
  причину.
- Таксономию микса (`flavorProfiles` / `flavors` / `flavorTags`) руками не
  задаём: как и у миксов Мастера, она собирается из табаков состава.
- Номер строки — часть id микса (`mix-catalog-hit-01`). Новые миксы
  добавлять в конец набора; перестановка строк меняет id.

## Хиты

| № | Название | Состав | Описание | Сигнал спроса | Источник |
|---|---|---|---|---|---|
| 1 | Морозная ягода | DARKSIDE / Core / Red Tea 50% · DARKSIDE / Core / Wildberry 40% · DARKSIDE / Core / Supernova 10% | Лесные ягоды на холодном чае и лёгкий мороз в финише. | «Хит» HookahPortal, ещё 2 сайта | [hookahportal.ru](https://hookahportal.ru/mix/moroznaya-yagoda) |
| 2 | Pinkman с грейпфрутом и малиной | MUSTHAVE / Основная / Grapefruit 40% · MUSTHAVE / Основная / Raspberry 30% · MUSTHAVE / Основная / Pinkman 30% | Грейпфрутовая горчинка, малина и клубника — сочно и без приторности. | 3 подборки, Pinkman — №1 бренда | [hookahhouse.ru](https://hookahhouse.ru/company/news/top_miksy_tabakov_dlya_kalyana/) |
| 3 | Ледяное яблоко с клюквой | Serbetli / Основная / Ice Apple 60% · Afzal / Основная / Cranberry 40% | Хрустящее яблоко со льдом и клюквенная кислинка. | классика, 4 подборки магазинов | [hookahhouse.ru](https://hookahhouse.ru/company/news/top_miksy_tabakov_dlya_kalyana/) |
| 4 | Mr. Pink | MUSTHAVE / Основная / Pinkman 50% · MUSTHAVE / Основная / Kiwi Smoothie 40% · MUSTHAVE / Основная / Frosty 10% | Грейпфрут с клубникой, киви и холодок, который бодрит, но не морозит. | HookahPortal и НН-Кальян | [hookahportal.ru](https://hookahportal.ru/mix/mr-pink) |
| 5 | Космокола | DARKSIDE / Core / Cosmo Flower 45% · DARKSIDE / Core / Darkside Cola 30% · DARKSIDE / Core / Supernova 25% | Кола с цветочно-черничной нотой и ледяным хвостом — визитка Darkside. | «Хит» HookahPortal | [hookahportal.ru](https://hookahportal.ru/mix/kosmokola) |
| 6 | Лимон с хвоей | DARKSIDE / Core / Lemonblast 40% · DARKSIDE / Core / Needls 40% · DARKSIDE / Core / Supernova 20% | Лимон, свежая хвоя и мороз. Прогулка по зимнему лесу, не выходя из-за стола. | «Классика» НН-Кальян | [nn-kalyan.ru](https://nn-kalyan.ru/dark-side-needls-opisanie-miksy-otzyvy/) |
| 7 | Тропики | DARKSIDE / Core / Bananapapa 60% · DARKSIDE / Core / Mango Lassi 2.0 40% | Спелый банан и манго-ласси — мягко, сладко, понятно с первой затяжки. | HookahPortal | [hookahportal.ru](https://hookahportal.ru/mix/tropiki) |
| 8 | Малина и персиковый чай | Tangiers / Tangiers Noir / Raspberry 50% · Tangiers / Tangiers Noir / Peach Iced Tea 50% | Малина в холодном персиковом чае на плотном Tangiers. | Hookah House и Alpha Hookah | [hookahhouse.ru](https://hookahhouse.ru/company/news/top_miksy_tabakov_dlya_kalyana/) |
| 9 | Pinkman и ананасовые кольца | MUSTHAVE / Основная / Pinkman 50% · MUSTHAVE / Основная / Pineapple Rings 50% | Два самых популярных вкуса MustHave в одной чаше: ягоды с грейпфрутом и ананас. | два топ-вкуса MustHave | [hookahportal.ru](https://hookahportal.ru/mix/pineapple-rings-pinkman) |
| 10 | Мандарин с черникой и жвачкой | Serbetli / Основная / Ice Bodrum Tangerine 50% · Al Fakher / Основная / Blueberry with mint 30% · Al Fakher / Основная / Gum 20% | Ледяной мандарин, черника с мятой и немного жвачки. | классика, 2 подборки | [hookahhouse.ru](https://hookahhouse.ru/company/news/top_miksy_tabakov_dlya_kalyana/) |
| 11 | Цитрусовый баланс | Black Burn / Основная / Red Orange 70% · MUSTHAVE / Основная / Lemon-Lime 30% | Красный апельсин, подкисленный лимоном и лаймом. | топ-10 2026, Red Orange — топ бренда | [alphahookah.ru](https://alphahookah.ru/blog/top-10-miksov-70-30-sladost-i-kislinka-formula-kotoraya-pochti-vsegda-rabotaet/) |
| 12 | Кола с лаймом | Сарма / Классическая / Кола 70% · DARKSIDE / Core / Starlime 30% | Кола с долькой лайма. Классика, которая не спорит. | топ-10 2026 | [alphahookah.ru](https://alphahookah.ru/blog/top-10-miksov-70-30-sladost-i-kislinka-formula-kotoraya-pochti-vsegda-rabotaet/) |
| 13 | Ягодная классика | Хулиган / Стандартная / OG Клуб 70% · Black Burn / Основная / Shock Currant Shock 30% | Клубника с ревенем и терпкая смородина. | топ-10 2026 | [alphahookah.ru](https://alphahookah.ru/blog/top-10-miksov-70-30-sladost-i-kislinka-formula-kotoraya-pochti-vsegda-rabotaet/) |
| 14 | Вишнёвый чизкейк | MUSTHAVE / Основная / Cheesecake 70% · Black Burn / Основная / Cherry Shock 30% | Сливочный чизкейк под кислой вишней. | топ-10 2026 | [alphahookah.ru](https://alphahookah.ru/blog/top-10-miksov-70-30-sladost-i-kislinka-formula-kotoraya-pochti-vsegda-rabotaet/) |
| 15 | Ананас, жвачка, энергетик | MUSTHAVE / Основная / Pineapple Rings 40% · Spectrum / Classic Line / Ice Fruit Gum 40% · Spectrum / Classic Line / Energy Storm 20% | Ананас, ледяная фруктовая жвачка и энергетик. Бодрит — без банки на столе. | 3 подборки, Ice Fruit Gum — топ Spectrum | [nn-kalyan.ru](https://nn-kalyan.ru/100-vkusnyx-miksov-dlya-vashego-kalyana/) |
| 16 | Мелонад с лимоном и лаймом | MUSTHAVE / Основная / Melonade 50% · MUSTHAVE / Основная / Lemon-Lime 30% · MUSTHAVE / Основная / Ice Mint 20% | Арбузно-дынный лимонад с цитрусом и мятным льдом. | Melonade — топ-3 MustHave | [nn-kalyan.ru](https://nn-kalyan.ru/must-have-melonade-obzor-miksy/) |
| 17 | Тархун с киви | MUSTHAVE / Основная / Kiwi Smoothie 40% · MUSTHAVE / Основная / Lemon-Lime 30% · MUSTHAVE / Основная / Estragon 20% · MUSTHAVE / Основная / Ice Mint 10% | Киви, лимон-лайм и тархун — вкус зелёной газировки из детства. | обзор топ-10 MustHave | [hookahhouse.ru](https://hookahhouse.ru/company/news/top_10_vkusov_tabaka_dlya_kalyana_mast_have_obzor_luchshikh_miksov_mast_khev/) |
| 18 | Банан, манго, марула | MUSTHAVE / Основная / Bananamama 40% · MUSTHAVE / Основная / Mango Sling 40% · MUSTHAVE / Основная / Marula 20% | Банан и манго с экзотической марулой. | обзор топ-10 MustHave | [hookahhouse.ru](https://hookahhouse.ru/company/news/top_10_vkusov_tabaka_dlya_kalyana_mast_have_obzor_luchshikh_miksov_mast_khev/) |
| 19 | Лимон с ананасом | DARKSIDE / Core / Lemonblast 65% · Serbetli / Основная / Pineapple 35% | Яркий лимон, смягчённый сладким ананасом. | подборка «топ миксы» | [premium-tabak.com](https://premium-tabak.com/stati/top-miksy-tabakov-dlya-kalyana/) |
| 20 | Корица и красный чай | MUSTHAVE / Основная / Cinnamon Roll 50% · DARKSIDE / Core / Red Tea 50% | Булочка с корицей к крепкому чаю. Осень в любое время года. | подборка «топ миксы» | [premium-tabak.com](https://premium-tabak.com/stati/top-miksy-tabakov-dlya-kalyana/) |
| 21 | Дыня с малиной | Tangiers / Tangiers Noir / Melon Blend 70% · Tangiers / Tangiers Noir / Raspberry 30% | Медовая дыня и малина на плотной базе Tangiers. | подборка «топ миксы» | [hookahhouse.ru](https://hookahhouse.ru/company/news/top_miksy_tabakov_dlya_kalyana/) |
| 22 | Цитрусовый чай с ромом | Spectrum / Classic Line / Citrus Mix 70% · Spectrum / Classic Line / Brazilian Tea 20% · Spectrum / Classic Line / Caribbean Rum 10% | Цитрусы, зелёный чай и тёплая ромовая нота. | подборка «топ миксы» | [store.allkalyans.com](https://store.allkalyans.com/articles/104776/) |
| 23 | Лимон-лайм с мятой | Tangiers / Tangiers Noir / New Lemon-Lime 75% · Tangiers / Tangiers Noir / Spearmint 25% | Лимон и лайм с садовой мятой — чисто и свежо. | НН-Кальян и летняя подборка Alpha | [alphahookah.ru](https://alphahookah.ru/blog/letnie-miksy-dlya-kalyana-luchshie-sochetaniya-vkusov/) |
| 24 | Банановая сторона | DARKSIDE / Core / Bananapapa 65% · DARKSIDE / Core / Bounty Hunter 20% · DARKSIDE / Core / Supernova 15% | Банан с кокосом и холодком. | «От шефа» HookahPortal | [hookahportal.ru](https://hookahportal.ru/mix/bananovaya-storona) |
| 25 | Барбарисовый лимонад | Sebero / Sebero Classic / Барбарис 40% · Sebero / Sebero Classic / Кола 30% · Sebero / Sebero Classic / Виноград 30% | Барбариска, кола и виноград на мягком Sebero. | топ популярных HookahPortal | [hookahportal.ru](https://hookahportal.ru/mix/barbarisovyi-limonad) |
| 26 | Bubble Fruit | Sebero / Sebero Arctic Mix / Bubble Fruit 100% | Бабл-гам, виноград, голубика и манго со льдом — уже смешано за вас. | Hookah House | [hookahhouse.ru](https://hookahhouse.ru/company/news/tabak_sebero_opisanie_lineyki_top_vkusov_zabivka/) |
| 27 | Молоко и банан | Adalya / Основная / Milk 50% · Adalya / Основная / Banana 50% | Банановый молочный коктейль, мягкий и дружелюбный. | 4kalyans | [4kalyans.ru](http://4kalyans.ru/tabak/tabak-dlya-kalyana-adalya.html) |
| 28 | Молоко и черника | Adalya / Основная / Milk 30% · Adalya / Основная / Blueberry 70% | Черника со сливками. | 4kalyans | [4kalyans.ru](http://4kalyans.ru/tabak/tabak-dlya-kalyana-adalya.html) |
| 29 | Лимонный пирог | Adalya / Основная / Lemon Pie 70% · Adalya / Основная / Milk 30% | Лимонный пирог со стаканом молока. | 4kalyans | [4kalyans.ru](http://4kalyans.ru/tabak/tabak-dlya-kalyana-adalya.html) |
| 30 | Печенье с ежевикой и корицей | Spectrum / Classic Line / Cookies & Milk 60% · Tangiers / Tangiers Noir / Brambleberry 25% · MUSTHAVE / Основная / Cinnamon 15% | Печенье с молоком, ежевичный джем и щепотка корицы. | подборка allkalyans | [store.allkalyans.com](https://store.allkalyans.com/articles/104776/) |
| 31 | Ананас с мятой | MUSTHAVE / Основная / Pineapple Rings 70% · Black Burn / Основная / Cane Mint 30% | Ананасовые кольца с тростниковой мятой. | подборка «топ миксы» | [premium-tabak.com](https://premium-tabak.com/stati/top-miksy-tabakov-dlya-kalyana/) |
| 32 | Малина с кислым ананасом | Sapphire Crown / Основная / Eden Raspberry 70% · Black Burn / Основная / Ananas Shock 30% | Сладкая малина и кислый ананас. | топ-10 2026 | [alphahookah.ru](https://alphahookah.ru/blog/top-10-miksov-70-30-sladost-i-kislinka-formula-kotoraya-pochti-vsegda-rabotaet/) |
| 33 | Клюква с бузиной | Nаш / White Line / Сахарная клюква 70% · Black Burn / Основная / Elderberry Shock 30% | Засахаренная клюква и терпкая бузина. | топ-10 2026 | [alphahookah.ru](https://alphahookah.ru/blog/top-10-miksov-70-30-sladost-i-kislinka-formula-kotoraya-pochti-vsegda-rabotaet/) |
| 34 | Огуречный спрайт с арбузом | Sebero / Sebero Arctic Mix / Огуречный спрайт 60% · Black Burn / Основная / Watermelon 40% | Огуречный лимонад со льдом и спелый арбуз. | подборка забивок 2026 | [alphahookah.ru](https://alphahookah.ru/blog/top-10-kalyannykh-zabivok-sloyami-kak-raspredelyat-tabak-chtoby-vkus-raskryvalsya-postepenno/) |

## Ниша

| № | Название | Состав | Описание | Почему ниша | Источник |
|---|---|---|---|---|---|
| 1 | Вишня, шоколад и кашмир | Tangiers / Tangiers Noir / Chocolate Mint 40% · Tangiers / Tangiers Noir / Dark cherry 40% · Tangiers / Tangiers Noir / Kashmir 20% | Тёмная вишня, мятный шоколад и пряный кашмир на крепком Noir. | крепкий Noir, пряная база | [nn-kalyan.ru](https://nn-kalyan.ru/tabak-dlya-kalyana-tangiers-opisanie-vkusy-miksy-otzyvy/) |
| 2 | Кашмирская вишня с орчатой | Tangiers / Tangiers Noir / Kashmir Cherry 50% · Tangiers / Tangiers Noir / Ololiuqui 30% · Tangiers / Tangiers Noir / Horchata 20% | Пряная вишня, кола с лаймом и рисовая орчата. | пряный Noir для опытных | [nn-kalyan.ru](https://nn-kalyan.ru/tabak-dlya-kalyana-tangiers-opisanie-vkusy-miksy-otzyvy/) |
| 3 | Чай с лимоном и грейпфрутом | Tangiers / Tangiers Noir / Lemon Tea 50% · Tangiers / Tangiers Noir / Mime 30% · Tangiers / Tangiers Noir / Pink Grapefruit 20% | Чёрный чай с лимоном, лайм с мятой и розовый грейпфрут. | чайный на крепком Noir | [nn-kalyan.ru](https://nn-kalyan.ru/tabak-dlya-kalyana-tangiers-opisanie-vkusy-miksy-otzyvy/) |
| 4 | Бергамот и индийское лето | DARKSIDE / Core / Bergamonstr 80% · Tangiers / Tangiers Noir / Indian Summer 20% | Бергамот, как в хорошем эрл грее, и фруктово-пряное индийское лето. | чайный, два крафтовых бренда | [nn-kalyan.ru](https://nn-kalyan.ru/tabak-dlya-kalyana-tangiers-opisanie-vkusy-miksy-otzyvy/) |
| 5 | Сычуаньская ёлка | Satyr / Aroma Collection / Isabel 30% · Satyr / Aroma Collection / Szechuan Pepper 30% · Satyr / Aroma Collection / Ёlki 30% · Satyr / Aroma Collection / Black Ice 10% | Изабелла, сычуаньский перец и хвоя. Покалывает язык и не даёт заскучать. | пряно-хвойный авторский Satyr | [nn-kalyan.ru](https://nn-kalyan.ru/tabak-dlya-kalyana-satyr-aroma-collection-szechuan-pepper-sychuanskiy-perets-opisanie-i-miksy/) |
| 6 | Томат с перцем | Satyr / Aroma Collection / Uncle Be 60% · Satyr / Aroma Collection / Szechuan Pepper 20% · Satyr / Old School Collection / Burley Cognac 20% | Спелый томат, перец и табачная база берли. Это не ошибка кухни. | гастро, редкий вкус томата | [nn-kalyan.ru](https://nn-kalyan.ru/tabak-dlya-kalyana-satyr-aroma-collection-uncle-be-tomat-opisanie-i-miksy/) |
| 7 | Травяной дюбек с колой | Satyr / Old School Collection / Duebeck Jagermeister 50% · Satyr / Aroma Collection / California Cola 30% · Satyr / Aroma Collection / Good Lemon 20% | Травяной табак-дюбек, кола и лимон — тёмная база Old School. | тёмная база Old School | [nn-kalyan.ru](https://nn-kalyan.ru/tabak-dlya-kalyana-satyr-opisanie-vkusy-miksy-otzyvy/) |
| 8 | Банан на сигарной базе | Satyr / Aroma Collection / Banana 50% · DARKSIDE / Core / Red Tea 30% · Satyr / Hookah Cigar Collection / Bahia Brazil 10% · Satyr / Old School Collection / Neft 10% | Банан и чай поверх сигарного листа. | табачно-сигарная база | [nn-kalyan.ru](https://nn-kalyan.ru/tabak-dlya-kalyana-satyr-opisanie-vkusy-miksy-otzyvy/) |
| 9 | Цветочный коктейль | Satyr / Aroma Collection / Margarita 60% · Satyr / Aroma Collection / Lastochka 40% | Цитрусовый коктейль «маргарита» с сиренью и крыжовником. | цветочный, обзор Satyr 2026 | [hookahhouse.ru](https://hookahhouse.ru/company/news/tabak_dlya_kalyana_satyr_obzor_top_vkusov_krepost_i_otzyvy/) |
| 10 | Френч-коктейль | Кобра / Основная / Лавандовый лимонад 45% · Кобра / Основная / Джин Бомбей 25% · Satyr / Aroma Collection / Good Lemon 25% · Satyr / Aroma Collection / Black Ice 5% | Лавандовый лимонад, можжевельник и лимон. Прованс в чаше. | «Хит» HookahPortal | [hookahportal.ru](https://hookahportal.ru/mix/french-cocktail) |
| 11 | Копчёная груша | DARKSIDE / Core / Pear 60% · DARKSIDE / Core / Basil Blast 30% · Spectrum / Classic Line / Bacon 10% | Груша, базилик и едва заметный дымок копчения. | гастро: базилик и бекон | [hookahportal.ru](https://hookahportal.ru/mix/kopcenaya-grusa) |
| 12 | Грейпфрут с базиликом и бузиной | Banger / Основная / Grapefruit 50% · Black Burn / Основная / Elderberry Shock 35% · Black Burn / Основная / Basilic 15% | Грейпфрут, терпкая бузина и зелёный базилик. | гастро-травяной акцент | [nn-kalyan.ru](https://nn-kalyan.ru/tabak-dlya-kalyana-black-burn-basilic-bazilik-opisanie-miksy-otzyvy/) |
| 13 | Бекон и пихта | База / Покрепче / Пихта 60% · Spectrum / Classic Line / Bacon 40% | Пихтовая смола и копчёный бекон. Ужин у костра в тайге. | гастро с хвоей | [alphahookah.ru](https://alphahookah.ru/blog/top-10-kalyannykh-zabivok-sloyami-kak-raspredelyat-tabak-chtoby-vkus-raskryvalsya-postepenno/) |
| 14 | Белый чай с кедровым орехом | База / Покрепче / Белый чай 50% · Sebero / Sebero Classic / Кедровый орех 30% · База / Покрепче / Кардамон 10% · Sebero / Sebero Classic / Ваниль 10% | Белый чай, кедровый орех, кардамон и капля ванили. | чайно-пряный осенний | [alphahookah.ru](https://alphahookah.ru/blog/osennie-miksy-dlya-kalyana-bez-pritornosti-chay-yagody-spetsii-orekhi/) |
| 15 | Лесной чай | Trofimoff’s / Burley / Sri Lanka 50% · DARKSIDE / Core / Blueberry Blast 25% · Oven / Основная / Black Currant 15% · Сарма / Классическая / Ореховое молочко 10% | Цейлонский чай на крепком берли, черника, смородина и ореховое молочко. | крепкий Trofimoff’s в чайной базе | [alphahookah.ru](https://alphahookah.ru/blog/osennie-miksy-dlya-kalyana-bez-pritornosti-chay-yagody-spetsii-orekhi/) |
| 16 | Алтайский сбор с ромашкой | Северный / Основная / Алтайский сбор 40% · Mattpear / Основная / Bitter Lemon 30% · Сарма / Классическая / Ромашковое варенье 20% · MUSTHAVE / Основная / Peppermint 10% | Горные травы, горький лимон, ромашковое варенье и мята. | травяной, сибирские бренды | [nn-kalyan.ru](https://nn-kalyan.ru/tabak-dlya-kalyana-sarma-opisanie-vkusy-miksy-otzyvy/) |
| 17 | Персик с ромашкой | Mattpear / Основная / Pulpy Peach 50% · Chabacco / Medium / Белое вино 30% · Сарма / Классическая / Ромашковое варенье 20% | Сочный персик, виноградная кислинка белого вина и ромашковый мёд. | цветочно-винный, чайная смесь Chabacco | [nn-kalyan.ru](https://nn-kalyan.ru/tabak-dlya-kalyana-sarma-opisanie-vkusy-miksy-otzyvy/) |
| 18 | Маракуйя с лаймом | Nirvana / Nirvana Super Shisha / Skull Control 60% · Nirvana / Nirvana Super Shisha / Optimus Lime 30% · Nirvana / Nirvana Super Shisha / Frank the Tank 10% | Маракуйя с мохито, лайм и цитрусовый акцент на американской Nirvana. | крепкая Nirvana | [kalyan-hut.ru](https://kalyan-hut.ru/blog/tabak-nirvana/) |
| 19 | Тирамису с какао | Sapphire Crown / Основная / Italian Tiramisu 50% · Северный / Основная / Несквик 50% | Тирамису и какао. Кофе заказывать не обязательно, но хочется. | кофейно-десертный | [alphahookah.ru](https://alphahookah.ru/blog/miksy-pod-napitki-zabivki-dlya-kofe-chaya-i-kakao/) |
