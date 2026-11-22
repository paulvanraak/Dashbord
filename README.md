# STOEP

Webshop-prototype voor streetwear: een eigen merk met de uitstraling van de Nederlandse straat (beton, rood fietspad, blauwe straatnaambordjes).

## Wat erin zit

- Homepage met de volgende drop als geplakte poster, inclusief aftelklok tot vrijdag 18:00 en een herinneringsknop
- Overzichtspagina's per categorie, merk, nieuw, sale en zoekresultaten
- Filters op merk, maat op voorraad, kleur, maximale prijs en sale, plus sorteren
- Productpagina met kleurvarianten, maatkeuze met voorraad, maattabel en gerelateerde items
- Favorieten en een winkelwagen-lade met voortgang naar gratis verzending
- Afrekenen met validatie (Nederlandse postcode), bezorgopties en een bevestigingspagina
- Licht en donker thema, werkt op mobiel, toetsenbord-toegankelijk

Producten worden getekend als SVG-fashion flats (`js/flats.js`), dus er zijn geen foto's nodig. Merken en producten zijn fictief en staan in `js/data.js`. Winkelwagen en favorieten worden in `localStorage` bewaard. Er is geen backend: bestellen is een demo.

## Lokaal draaien

Geen build-stap nodig. Open `index.html` in je browser, of start een simpele server:

```sh
python3 -m http.server 8000
```

en ga naar http://localhost:8000.
