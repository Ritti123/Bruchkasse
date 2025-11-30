"use client"

import { Users, Smartphone, Cloud, ArrowRight, CheckCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

/**
 * KONZEPT: Mehrere Personen gleichzeitig bedienen
 *
 * Da die App komplett offline und ohne Backend läuft, gibt es mehrere Möglichkeiten:
 */

export function MultiCustomerConcept() {
  return (
    <div className="space-y-6 p-4">
      <h2 className="text-xl font-bold text-center">Konzept: Mehrere Kunden gleichzeitig</h2>

      {/* Option 1: Mehrere Geräte */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="h-5 w-5 text-blue-500" />
            Option 1: Mehrere Geräte (Empfohlen)
          </CardTitle>
          <CardDescription>Einfachste und stabilste Lösung</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5" />
            <div>
              <p className="font-medium">Workflow:</p>
              <ol className="text-sm text-muted-foreground list-decimal ml-4 mt-1 space-y-1">
                <li>Artikelstamm am PC pflegen und als JSON exportieren</li>
                <li>JSON auf mehrere Handys importieren (z.B. via AirDrop, E-Mail, USB)</li>
                <li>Jedes Handy arbeitet unabhängig offline</li>
                <li>Am Ende des Tages: Verkaufshistorie von allen Geräten exportieren</li>
                <li>Am PC zusammenführen (Excel/CSV)</li>
              </ol>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg text-sm">
            <p className="font-medium text-emerald-700 dark:text-emerald-300">Vorteile:</p>
            <ul className="text-emerald-600 dark:text-emerald-400 mt-1 space-y-1">
              <li>• Komplett offline möglich</li>
              <li>• Keine Synchronisationsprobleme</li>
              <li>• Ausfallsicher - ein Gerät kann kaputt gehen</li>
              <li>• Keine zusätzlichen Kosten</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Option 2: Multi-Tab Warenkörbe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-purple-500" />
            Option 2: Parallele Warenkörbe (1 Gerät)
          </CardTitle>
          <CardDescription>Ein Gerät, mehrere Kunden gleichzeitig</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <ArrowRight className="h-5 w-5 text-purple-500 mt-0.5" />
            <div>
              <p className="font-medium">Mögliche Umsetzung:</p>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• Tabs/Slots für bis zu 3-4 parallele Warenkörbe</li>
                <li>• Schnelles Wechseln zwischen Kunden per Swipe oder Tab</li>
                <li>• Farbcodierung: Kunde 1 = Blau, Kunde 2 = Grün, etc.</li>
                <li>• Jeder Warenkorb hat eigene Personalnummer</li>
              </ul>
            </div>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg text-sm">
            <p className="font-medium text-amber-700 dark:text-amber-300">Hinweis:</p>
            <p className="text-amber-600 dark:text-amber-400 mt-1">
              Kann bei Bedarf implementiert werden. Erhöht die Komplexität etwas.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Option 3: Cloud-Sync (Zukunft) */}
      <Card className="opacity-70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cloud className="h-5 w-5 text-gray-500" />
            Option 3: Cloud-Synchronisation (Zukunft)
          </CardTitle>
          <CardDescription>Echtzeit-Sync zwischen Geräten</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Würde ein Backend erfordern (z.B. Supabase, Firebase). Ermöglicht Echtzeit-Synchronisation von Artikeln und
            Verkäufen. Höhere Komplexität und laufende Kosten.
          </p>
        </CardContent>
      </Card>

      {/* Empfehlung */}
      <Card className="border-emerald-500 bg-emerald-50 dark:bg-emerald-950">
        <CardContent className="p-4">
          <p className="font-semibold text-emerald-700 dark:text-emerald-300">Empfehlung für deinen Anwendungsfall:</p>
          <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">
            <strong>Option 1</strong> ist ideal für Bruchverkauf im Lager. Mehrere günstige Handys/Tablets mit der
            gleichen Artikelliste. Am Ende des Tages werden die Verkäufe zusammengeführt. Einfach, robust,
            offline-fähig.
          </p>
          <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">
            <strong>Option 2</strong> kann ich gerne implementieren, wenn du oft 2-3 Kunden gleichzeitig mit einem Gerät
            bedienen musst.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
