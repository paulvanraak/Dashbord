# Life Dashboard

Eén pagina met je agenda, mail, monday-taken en Slack, plus elke werkdag om 06:45 een ochtendbriefing.

**Dashboard:** https://claude.ai/artifact/Ko1DXV22FLEmJfAXxUuRLz (privé, alleen voor jou)

## Hoe het werkt

```
Elke werkdag 06:45 (Europe/Amsterdam): Routine "Life Dashboard – ochtendbriefing"
   ├─ Google Calendar → afspraken vandaag en morgen
   ├─ Gmail           → inbox van het afgelopen etmaal
   ├─ monday.com      → items die aan jou zijn toegewezen
   └─ Slack           → mentions en DM's
          ↓  schrijft de briefing
   Database van het dashboard: briefings/<datum>
          ↓
Dashboard (claude.ai)
   ├─ Bovenaan: de briefing van vandaag
   └─ Daaronder: live overzichten die bij het openen worden opgehaald met jouw eigen koppelingen
```

Alles in dark mode. Acties verschijnen als je met de muis over een regel gaat. Op je telefoon staan ze er altijd.

| Bord | Wat je ziet | Acties |
|---|---|---|
| **Agenda** | Dag voor dag, met een lijn op het huidige tijdstip, overlappende afspraken en vrije blokken tussen 09:00 en 18:00 | Ja, Misschien of Nee op uitnodigingen |
| **Mail** | Inbox, Ongelezen of Belangrijk, 8 per pagina met ‹ › | Gelezen/ongelezen, archiveren, verwijderen (met "ongedaan maken") |
| **Taken** | Alle monday-items die aan jou zijn toegewezen, gegroepeerd per bord. "Aandacht" toont wat op jou wacht, vastzit of binnen twee dagen af moet | Vinkje: zet het item op het "klaar"-label van dat bord (met "ongedaan maken") |
| **Slack** | Mentions en DM's van de afgelopen 3 dagen, gegroepeerd per thread, met het beginbericht erbij | Gelezen/ongelezen, ✅-reactie, antwoorden in de thread |

Gelezen en ongelezen bij Slack gelden alleen in dit dashboard. De Slack-koppeling kan de status in Slack zelf niet aanpassen.

**Maak briefing nu** maakt dezelfde briefing op het moment dat je erom vraagt. Handig in het weekend of als je dag halverwege verandert.

## Bestanden

| Bestand | Wat |
|---|---|
| `dashboard/index.html` | De pagina zelf. Na een wijziging opnieuw publiceren naar dezelfde URL. |
| `routine/ochtendbriefing.md` | De prompt van de Routine, met de vorm van het briefing-document. |

## Eenmalig instellen: koppelingen aan de Routine

De Routine heeft Gmail, Google Calendar, monday.com en Slack nodig. Ga in claude.ai naar **Routines**, open **Life Dashboard – ochtendbriefing** en voeg die vier koppelingen toe. Zonder koppelingen kan de Routine geen gegevens ophalen.

## Aanpassen

- **Tijdstip of dagen:** wijzig het schema van de Routine (nu `45 6 * * 1-5`, Europe/Amsterdam).
- **Inhoud van de briefing:** pas `routine/ochtendbriefing.md` aan en zet dezelfde tekst in de Routine.
- **Pagina:** pas `dashboard/index.html` aan en publiceer opnieuw.
