// app.json holds the config; this only lets a build machine hand over the Firebase files as EAS file variables
// (GOOGLE_SERVICES_JSON / GOOGLE_SERVICE_INFO_PLIST), since they are never committed.
module.exports = ({ config }) => ({
  ...config,
  android: { ...config.android, googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? config.android.googleServicesFile },
  ios: { ...config.ios, googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST ?? config.ios.googleServicesFile },
});
