
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://6fd6c61ce4d12d585ab4a0b5500014f4@o4509630546378752.ingest.de.sentry.io/4509630551883856",
  sendDefaultPii: true,
  tracesSampleRate: 1.0,
});

Sentry.captureMessage("Sentry test message from client config"); 