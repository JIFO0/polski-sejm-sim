export const THEME_KEY = "sejmsim.theme.v2";

/** Legacy preferences may originate from the former dark default. */
export function prefersDarkTheme(preference: string | null) {
  return preference === "dark";
}

export const THEME_BOOT = `(function(){var dark=false;try{dark=localStorage.getItem("${THEME_KEY}")==="dark";}catch(e){}document.documentElement.classList.toggle("dark",dark);document.documentElement.style.colorScheme=dark?"dark":"light";})();`;