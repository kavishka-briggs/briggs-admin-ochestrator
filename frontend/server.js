import express from "express";
import dotenv from "dotenv";
import helmet from 'helmet';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const sharedSources = [
  "'self'",
  "briggsdev.tech",
  "*.briggsdev.tech",
  "briggsandwalker.com",
  "*.briggsandwalker.com",
];

// Helmet config — CSP fetch directives enabled for XSS mitigation while
// allowing Module Federation remotes and API calls on Briggs domains.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: sharedSources,
        scriptSrc: sharedSources,
        // CSS-in-JS / component libraries commonly emit inline styles
        styleSrc: [...sharedSources, "'unsafe-inline'"],
        imgSrc: [...sharedSources, "data:", "blob:"],
        fontSrc: [...sharedSources, "data:"],
        connectSrc: sharedSources,
        frameSrc: sharedSources,
        mediaSrc: sharedSources,
        workerSrc: [...sharedSources, "blob:"],
        manifestSrc: sharedSources,
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    frameguard: { action: "deny" }
  })
);

// Generate `config.js` dynamically at runtime
app.get("/config-orch.js", (req, res) => {
  const config = `
    window.orch_env = {
      VITE_MICROFRONTEND_HOSTED_URL: "${process.env.VITE_MICROFRONTEND_HOSTED_URL?.trim() || ""}",
      VITE_GATEWAY_URL: "${process.env.VITE_GATEWAY_URL?.trim() || ""}",
      VITE_SIGN_UP_ENABLED: "${process.env.VITE_SIGN_UP_ENABLED?.trim() || ""}",
    };
  `;
  res.setHeader("Content-Type", "application/javascript");
  res.send(config);
});

// Serve static files from Vite build
app.use(express.static("/app"));

// Serve index.html for all unknown routes
app.get(/.*/, (_, res) => {
  res.sendFile("/app/index.html");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
