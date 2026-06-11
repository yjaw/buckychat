import posthog from "posthog-js";

export function initPostHog() {
  posthog.init("phc_ArGyYARr3AKnN4fdCFcAcnpE6DeXGZ3hWQ95AyDgKaLi", {
    api_host: "https://us.i.posthog.com",
    person_profiles: "never",       // no personal profiles — privacy friendly
    ip: false,                       // anonymize IP
    persistence: "memory",           // cookieless — no cookies stored
    capture_pageview: true,
    capture_pageleave: true,
  });
}

export { posthog };
