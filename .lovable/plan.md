# Własne partie i wspólne listy (połączenia partii)

## Co zobaczysz
- Nowa zwijana sekcja „Własne partie i wspólne listy” obok ustawień poparcia.
- **Dodaj partię**: nazwa, skrót, kolor, opcjonalny obrazek .jpg (logo). Nowa partia pojawia się wszędzie: na suwakach, mapie, w składzie Sejmu, progach, frekwencji i koalicjach.
- **Poparcie własnej partii**: ustawiasz je w całym kraju (suwak + pole %) albo osobno w wybranym okręgu przez panel okręgu, tak jak dla istniejących partii.
- **Wspólna lista**: wybierasz 2 lub więcej partii, nadajesz nazwę, kolor i opcjonalny .jpg. Ich poparcie się sumuje, a suwak „Zachowane poparcie” (50–100%, domyślnie 85%) mówi, jaka część wyborców zostaje przy wspólnej liście. Reszta przechodzi do puli „Inne” (lub nieprzypisanych w trybie proporcjonalnym). Partie składowe znikają z wyników, dopóki lista istnieje; rozwiązanie listy przywraca je.
- Próg dla wspólnej listy: domyślnie 8% (jak dla koalicji komitetów), do zmiany w sekcji progów; własna partia domyślnie 5%.
- Edycja i usuwanie własnych partii i list w każdej chwili.

## Zapis i udostępnianie
- Własne partie i wspólne listy zapisują się w bibliotece scenariuszy, w pobieranym pliku i w obecnych linkach udostępniania (linki serwera ?s= i #scenario=).
- Obrazki .jpg **nie trafiają** do linków ani na serwer. Zostają tylko w tej przeglądarce; u osoby, która otworzy link, partia pokaże znak literowy w swoim kolorze.
- Udostępnianie dalej działa na obecnym własnym magazynie strony, bez dodawania niczego do Lovable Cloud.
- Starsze scenariusze i linki wczytują się jak dotąd.

## Szczegóły techniczne
- `Scenario` dostaje opcjonalne `customParties: {id,name,short,color}[]` i `mergers: {id,name,short,color,members[],retention}[]`.
- Rejestr partii staje się dynamiczny: `getParty(id, scenario)` łączy `PARTIES` z własnymi; `PartyLogo`, mapa, hemicykl, koalicje, frekwencja i progi korzystają z niego zamiast stałego `PARTY_MAP`.
- `simulate`/`effectiveShares`: przed D'Hondtem w każdym okręgu udziały członków listy są sumowane × retention pod id listy; różnica trafia do „inne” (tryb standardowy) lub zostaje nieprzypisana (tryb proporcjonalny).
- Obrazki: plik .jpg ≤ 500 kB odczytany jako data URL, trzymany w localStorage `sejmsim.custom-logos.v1` (id → dataURL), pomijany przy serializacji scenariusza.
- `createShare` / walidacja wczytywania: akceptuje nowe pola z limitami (max 10 własnych partii, 5 list, nazwy ≤ 40 znaków, kolor hex).
- Nowe zdarzenia statystyk: `custom_party_add`, `merger_create`.
- Weryfikacja: dodanie partii, poparcie krajowe i okręgowe, lista z retencją, zapis, link, plik, telefon i komputer.
