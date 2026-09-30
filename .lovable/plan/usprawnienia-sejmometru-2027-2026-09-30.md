# Usprawnienia Sejmometru 2027

## Zakres
- Zablokować kolejność kafelków partii podczas przeciągania suwaka i sortować je dopiero po jego zwolnieniu.
- Dodać na dole odnośnik do aktualnych sondaży ewybory.eu; bez automatycznego pobierania, ponieważ strona nie udostępnia stabilnego publicznego źródła danych.
- Rozciągnąć mocniejsze, wyraźniejsze tło cząsteczkowe za całą stroną, bez zasłaniania treści.
- Przeredagować nagłówek na formalny i usunąć znaki „·” oraz „—” z widocznych treści.
- Dodać u góry przyciski „Dodaj opinię” i „Kontakt”, kierujące do jifo.dev.
- Dodać sekcję autora: Iwo Laskowski, JIFO, Gdynia, ekonomia, technologia, web, DevOps, UI/UX oraz fotografia, z linkiem do jifo.dev.
- Zagęścić i uporządkować 460 kropek w czytelnym półkolu sali sejmowej.
- Dodać przeciąganie partii pomiędzy grupami „Zyskują przy wyższej frekwencji” i „Zyskują przy niższej frekwencji”.
- Dodać maksymalnie 10 nazwanych scenariuszy zapisywanych w przeglądarce, widocznych po prawej stronie schematu Sejmu.
- Dodać udostępnianie bieżącego scenariusza przez link; dane zostaną zapisane w adresie, bez serwera.
- Zachować obecny zapis i odczyt plików JSON.

## Szczegóły techniczne
- Dane lokalne i linki będą odczytywane dopiero po uruchomieniu strony w przeglądarce, aby uniknąć rozbieżności renderowania.
- Zapis lokalny otrzyma walidację wersji, limit 10 pozycji, zmianę nazwy, wczytanie i usuwanie.
- Przeciąganie partii będzie działało także przez kliknięcie jako dostępna alternatywa.
- Po zmianach sprawdzę widok komputerowy i mobilny, suwaki, zapis po odświeżeniu, link udostępniania i brak błędów.
