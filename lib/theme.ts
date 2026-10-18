// Two separate themes with two defaults:
//  - the public site (landing, games, questions, legal, contact) is LIGHT unless someone picks dark there;
//  - the app, once signed in, is DARK unless someone picks light in Settings.
// Each keeps its own saved choice, so changing one never changes the other. Whether someone is signed in is remembered
// in our own flag (set when the sign-in state changes), because Firebase moves its own record between storage
// backends while it starts up, so it is not reliably there before the page paints.

export const APP_THEME_KEY = "hm_theme_app";
export const SITE_THEME_KEY = "hm_theme_site";

export const SIGNED_IN_KEY = "hm_signed_in";

/** Called whenever the sign-in state is known. */
export const rememberSignedIn = (signedIn: boolean) => {
  try {
    if (signedIn) localStorage.setItem(SIGNED_IN_KEY, "1");
    else localStorage.removeItem(SIGNED_IN_KEY);
  } catch { /* storage blocked */ }
};

export const isSignedIn = () => {
  try {
    if (localStorage.getItem(SIGNED_IN_KEY) === "1") return true;
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i)?.startsWith("firebase:authUser:")) return true;
    }
  } catch { /* storage blocked */ }
  return false;
};

export const themeKey = () => (isSignedIn() ? APP_THEME_KEY : SITE_THEME_KEY);

/** Should the page be light right now? */
export const wantsLight = () => {
  const signedIn = isSignedIn();
  try {
    const saved = localStorage.getItem(signedIn ? APP_THEME_KEY : SITE_THEME_KEY);
    return signedIn ? saved === "light" : saved !== "dark";
  } catch {
    return !signedIn;
  }
};

/** The same rule as a tiny script that runs before the first paint, so there is never a flash of the wrong theme. */
export const THEME_BOOT_SCRIPT =
  'try{var s=localStorage.getItem("hm_signed_in")==="1";' +
  'for(var i=0;!s&&i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf("firebase:authUser:")===0)s=true}' +
  'var p=localStorage.getItem(s?"hm_theme_app":"hm_theme_site");var l=s?p==="light":p!=="dark";' +
  'if(l)document.documentElement.setAttribute("data-theme","light")}catch(e){document.documentElement.setAttribute("data-theme","light")}';
