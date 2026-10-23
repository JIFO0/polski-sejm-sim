# Polski Sejm Sim

Stwórz stronę internetową która ma symulować wybory do sejmu w Polsce 2027. Bedzie można zaznaczać okręgi wyborcze na interaktywnej mapie dla każdej z partii i patrzeć ilu poslów by to dało. Będzie można łączyć partie w grupy żeby ocenić kto jakie ma możliwości i z kim. Weź z internetu loga wszystkich partii w Polsce, oraz mapę. Pomyśl to tak, żeby można było tworzyć własne scenariusze i predykcje. W każdym okręgu wyborczym będzie można ustalić frekwencję wyborczą która będzie wpływała na wynik i dzięki temu stworzyć bardzo kompleksową symulację, a nawet ją zapisać by potem wgrać. Domyślnym punktem wyjścia powinna być obecna sytuacja według ewybory.eu na dzisiaj

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/328b0072-f5db-477f-9811-7eb7af31c731).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Sondaże i średnia SejmSim

SejmSim jest niekomercyjnym serwisem obywatelskim. Nie kopiuje gotowych średnich innych serwisów. Krajowe poparcie, od którego startuje symulator, liczy `src/lib/poll-average.ts` z pierwotnych badań w `src/data/polls.json`.

Metoda (skrót, pełny opis jest w komentarzu w kodzie i na stronie `/zrodla`):

- do średniej wchodzą badania z datą publikacji i wynikami;
- domyślnie są to sondaże z ostatnich 30 dni, a gdy jest ich mniej niż 4, dokładane są starsze, do maksymalnie 12;
- waga = świeżość (spadek o połowę co 14 dni) × liczebność próby / 1000;
- brak próby daje wagę próby 1, bez dopisywania liczby respondentów;
- partia nieobecna w badaniu nie jest liczona jako 0%;
- w ciszy wyborczej (`src/data/election-silence.json`) nie publikujemy nowych wyników.

W repozytorium nie było pojedynczych sondaży, tylko odesłanie do średniej ewybory.eu z 30 września 2026 rozpisanej na okręgi. Tych liczb nie wpisano do zbioru jako badania. Plik `polls.json` startuje pusty. Profil okręgowy w `src/data/districts.ts` służy do rozłożenia krajowej średniej na 41 okręgów, gdy średnia już powstanie.

### Jak dodać nowy sondaż

Dopisz jeden obiekt do tablicy w `src/data/polls.json`. Nie zgaduj brakujących danych: zostaw `null`.

```json
{
  "id": "przyklad-osrodek-2026-10-01",
  "institute": "Nazwa ośrodka badawczego",
  "commissioner": "Zleceniodawca albo null",
  "fieldworkFrom": "2026-09-28",
  "fieldworkTo": "2026-09-30",
  "publishedAt": "2026-10-01",
  "sampleSize": 1000,
  "method": "CATI",
  "methodDetail": null,
  "publicationTitle": null,
  "results": { "ko": 32.0, "pis": 28.0, "konf": 12.0 },
  "sourceUrl": "https://przyklad.pl/publikacja-sondazu"
}
```

- `method` to `CATI`, `CAWI`, `mix` albo `null`. Opcjonalne `methodDetail` podaje pełniejszy opis metody, a `publicationTitle` tytuł i numer publikacji. Oba pola można pominąć.
- Klucze w `results` są identyfikatorami partii z `src/data/parties.ts` (`ko`, `pis`, `konf`, `kkp`, `nl`, `razem`, `rp`, `psl`, `pl2050`, `inne`). Wartości to procenty.
- `sourceUrl` prowadzi do publikacji źródłowej, nie do cudzej średniej.
- `id` ma być unikalne i stałe.

Ciszę wyborczą dopisuje się osobno, na przykład:

```json
{
  "label": "Wybory do Sejmu",
  "from": "2027-10-16T00:00:00+02:00",
  "until": "2027-10-17T21:00:00+02:00"
}
```

`from` to początek ciszy (24 godziny przed dniem głosowania), `until` to zakończenie głosowania. W tym przedziale strona nie pokazuje sondaży opublikowanych po `from` i nie przelicza nimi średniej.
