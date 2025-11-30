"use client"

import { useEffect } from "react"

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log("[App] Service Worker registriert:", registration.scope)

          // Prüfe auf Updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  console.log("[App] Neuer Service Worker verfügbar. Bitte App neu laden.")
                  // Optional: Benachrichtigung an User, dass Update verfügbar ist
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error("[App] Service Worker Registrierung fehlgeschlagen:", error)
        })
    } else {
      console.warn("[App] Service Worker nicht unterstützt in diesem Browser")
    }
  }, [])

  return null
}
