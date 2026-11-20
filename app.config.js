// Adds what app.json can't hold, from the build environment (never committed):
// - GOOGLE_MAPS_API_KEY (EAS environment variable): the Google Maps key for
//   Android. Without it, Android shows "Use my location" instead of a map
//   (extra.androidMaps); iOS always uses Apple Maps, which needs no key.
// - GOOGLE_SERVICES_JSON (EAS file environment variable): Firebase's
//   google-services.json, which Android push notifications need. A
//   google-services.json in the project folder is used when the variable isn't
//   set. Without either, the app builds but Android can't get a push token.
const fs = require("fs");

module.exports = ({ config }) => {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  const googleServices = process.env.GOOGLE_SERVICES_JSON || (fs.existsSync("./google-services.json") ? "./google-services.json" : undefined);
  return {
    ...config,
    android: { ...config.android, ...(googleServices ? { googleServicesFile: googleServices } : {}) },
    plugins: [...(config.plugins ?? []), ["react-native-maps", key ? { androidGoogleMapsApiKey: key } : {}]],
    extra: { ...config.extra, androidMaps: Boolean(key) },
  };
};
