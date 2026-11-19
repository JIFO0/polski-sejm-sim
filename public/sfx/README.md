# Dźwięki interfejsu (SFX)

Bardzo ciche, ambientowe dźwięki do symulatora. Wygenerowane modelem ElevenLabs Sound Effects (eleven_text_to_sound_v3), wybrane ręcznie.

- Pliki: `<id>.ogg` (Opus) + `<id>.mp3` (zapas dla starszych przeglądarek, np. Safari bez Opus w OGG). Mono, od 0,3 do 1,2 s.
- Obróbka: obcięta cisza, krótkie fade'y, normalizacja do ok. -30 dBFS RMS (≈ -30 LUFS) i szczyt najwyżej -6 dBFS.
- W aplikacji dodatkowo działa globalne wyciszenie `SFX_MASTER_GAIN` (0.15) w `src/lib/sfx.ts`.
- Mapowanie zdarzenie → dźwięk jest w jednym miejscu: `SFX_EVENT_MAP` w `src/lib/sfx.ts`.
