# Uporządkowanie symulatora i dane historyczne

## Zakres
- Usunąć zakładkę oraz wszystkie gotowe scenariusze, zachowując własne zapisy, udostępnianie linkiem i pliki JSON.
- Połączyć ustawienia frekwencji w jednej sekcji: suwak krajowy, siła efektu oraz przypisanie partii do trzech grup wpływu; usunąć powielony suwak wrażliwości z ustawień progów.
- Przebudować tło na subtelne, przeważnie szare punkty, które powoli dryfują i okresowo przechodzą w barwy partii; zachować niski poziom krycia i ograniczenie animacji systemowej.
- Dodać czytelne porównanie oficjalnych wyników wyborów do Sejmu z 2023 i 2019 roku, z poparciem i liczbą mandatów oraz odnośnikami do źródła.
- W trybie mapy „Jedna partia” pokazywać w podpowiedzi dokładne poparcie procentowe wybranej partii w okręgu zamiast podziału mandatów.
- Powiększyć znak SejmSim w nagłówku bez zaburzania układu mobilnego.
- Naprawić obecne błędy kompilacji związane z kodem gotowych scenariuszy.

## Układ
- Biblioteka własnych scenariuszy pozostanie obok składu Sejmu, ale bez przełącznika „Gotowe”.
- „Wpływ frekwencji” znajdzie się bezpośrednio pod suwakami frekwencji w jednej szerokiej sekcji.
- Wyniki historyczne pojawią się jako osobna sekcja porównawcza po mapie i przed budowaniem koalicji.

## Dane i weryfikacja
- Wyniki 2023 i 2019 oprę na oficjalnych danych PKW, z jasnym oznaczeniem, że są to wyniki historyczne, a nie scenariusze do wczytania.
- Sprawdzę wiarygodne i legalnie dostępne źródła sondaży oraz wyjaśnię, czy istnieje publiczne API lub baza nadająca się do automatycznego wykorzystania.
- Zweryfikuję stronę na komputerze i telefonie: zapis scenariuszy, mapę i podpowiedzi, sekcję frekwencji, wyniki historyczne, animację oraz brak błędów.
