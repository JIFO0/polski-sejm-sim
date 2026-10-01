export const EVENTS = [
  "page_view",
  "turnout_set",
  "scenario_save",
  "scenario_download",
  "scenario_share",
  "scenario_load",
  "scenario_upload",
  "share_link_create",
  "share_link_open",
  "independent_mode",
  "threshold_change",
  "party_toggle",
  "a11y_setting",
  "feedback_open",
] as const;
export type AnalyticsEvent = (typeof EVENTS)[number];

export const EVENT_LABELS: Record<AnalyticsEvent, string> = {
  page_view: "Wejścia na stronę",
  turnout_set: "Zmiany frekwencji",
  scenario_save: "Zapisy w bibliotece",
  scenario_download: "Pobrane scenariusze",
  scenario_share: "Skopiowane linki (stare)",
  scenario_load: "Wczytane scenariusze",
  scenario_upload: "Wczytane pliki",
  share_link_create: "Utworzone linki",
  share_link_open: "Otwarte linki",
  independent_mode: "Przełączenia wyboru proporcjonalnego",
  threshold_change: "Zmiany progów",
  party_toggle: "Włączenia/wyłączenia partii",
  a11y_setting: "Zmiany dostępności",
  feedback_open: "Otwarcia formularza opinii",
};
