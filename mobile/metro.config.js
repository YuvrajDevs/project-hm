// Metro config for the Android/iOS app.
//
// The app shares the web app's pure logic and data layer (../lib) instead of copying it, so a rule fixed once is
// fixed everywhere. Three things make that work:
//  1. `watchFolders` lets Metro see files outside this folder (../lib, ../public for the pixel icons and stickers).
//  2. A package imported from a shared file is resolved as if it were imported from this folder, so shared code
//     always gets the app's copy of a package (never the web app's node_modules one level up).
//  3. A handful of web-only modules are swapped for their native equivalents (see ALIASES): the Firebase JS SDK
//     becomes the native Firebase SDK (@react-native-firebase mirrors its modular API), and the browser key store
//     and the relative-URL reset client get native versions. The shared code itself is unchanged.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "..");
const src = (p) => path.join(projectRoot, "src", p);

const config = getDefaultConfig(projectRoot);

config.watchFolders = [path.join(repoRoot, "lib"), path.join(repoRoot, "public")];

// Bare imports swapped wherever they appear (shared files and app files alike)
const PACKAGE_ALIASES = {
  "firebase/firestore": "@react-native-firebase/firestore",
  "firebase/storage": src("native/storageShim.ts"),
};

// Shared lib files that touch the browser, swapped for native versions (matched by absolute path)
const FILE_ALIASES = {
  [path.join(repoRoot, "lib", "firebase.ts")]: src("native/firebase.ts"),
  [path.join(repoRoot, "lib", "e2eeStore.ts")]: src("native/keyStore.ts"),
  [path.join(repoRoot, "lib", "chatReset.ts")]: src("native/chatReset.ts"),
};

const defaultResolve = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  let name = moduleName;
  if (PACKAGE_ALIASES[name]) name = PACKAGE_ALIASES[name];
  // "@/lib/..." is the web app's alias for the repo root; "~/..." is this app's own src folder
  else if (name.startsWith("@/")) name = path.join(repoRoot, name.slice(2));
  else if (name.startsWith("~/")) name = path.join(projectRoot, "src", name.slice(2));

  const resolve = defaultResolve ?? context.resolveRequest;
  const bare = !name.startsWith(".") && !path.isAbsolute(name);
  const fromShared = !context.originModulePath.startsWith(projectRoot + path.sep);
  const ctx = bare && fromShared ? { ...context, originModulePath: path.join(projectRoot, "index.ts") } : context;
  const result = resolve(ctx, name, platform);
  if (result && result.type === "sourceFile") {
    const swapped = FILE_ALIASES[path.normalize(result.filePath)];
    if (swapped) return { type: "sourceFile", filePath: swapped };
  }
  return result;
};

module.exports = config;
