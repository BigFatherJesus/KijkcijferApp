# Kijkcijfers Visualisatie App

Deze applicatie visualiseert kijkcijfersdata op basis van Excel-bestanden. Het toont het aantal kijkers per uur en per dag, met diverse weergaveopties en interactieve grafieken.

## Functionaliteiten

- Upload Excel-bestanden met kijkcijfersdata
- Visualiseer kijkcijfers per uur in staaf- of lijndiagrammen
- Twee weergavemodi:
  - **Per uur**: Bekijk gemiddelde, maximale of dagspecifieke kijkcijfers per uur
  - **Per dag**: Bekijk het totaal aantal kijkers per dag in de hele maand
- Interactieve grafieken - klik op een dag in de dagweergave om de uurdetails te zien
- Uitgebreide samenvattingsstatistieken met piekuren, piekdagen en totalen
- Vergelijk data tussen verschillende maanden

## Installatie

1. Installeer de dependencies:
   ```
   npm install
   ```

2. Start de ontwikkelingsserver:
   ```
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in je browser om de applicatie te bekijken.

## Excel-bestandsformaat

De applicatie verwacht Excel-bestanden in het volgende formaat:
- Bevat een werkblad met kolommen voor:
  - Datum (vaak in Excel datumformaat)
  - Dag van de week
  - Tijdvak (bijv. "02:00-02:59")
  - Kijkdichtheidspercentages (Kdh%) voor verschillende doelgroepen
  - Totaal percentage ("TOTAL" kolom)
  - Totale dagelijkse kijkdichtheid ("Dagcijfers" kolom)

De applicatie zoekt naar een rij met de headers "Datum", "Dag", en "Tijdvak" om de datastructuur te bepalen, en begint vervolgens met het verwerken van de data eronder.

## Hoe werkt het?

1. Upload één of meerdere Excel-bestanden via de uploadknop
2. De app verwerkt de data en berekent de kijkcijfers per uur
   - De berekening wordt gedaan op basis van de percentages en het totaal aantal kijkers per dag
   - Er wordt niet gebruikgemaakt van vooraf berekende waarden in de Excel-bestanden
3. Bekijk de data in verschillende weergavemodi:
   - **Per uur**:
     - Gemiddeld aantal kijkers per uur over de hele maand
     - Maximum aantal kijkers per uur over de hele maand
     - Kijkcijfers per uur voor een specifieke dag
   - **Per dag**:
     - Totaal aantal kijkers per dag in de hele maand
     - Klik op een dag om details per uur te bekijken

## Interactie

- Klik op een dag in de dagweergave om direct naar de uurdetails voor die dag te gaan
- Schakel tussen staaf- en lijndiagrammen voor verschillende visualisaties
- Bekijk uitgebreide statistieken in het samenvattingsgedeelte

## Gebouwd met

- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Chart.js](https://www.chartjs.org/)
- [SheetJS](https://sheetjs.com/)
- [Tailwind CSS](https://tailwindcss.com/) 

## Docker Deployment

### Lokaal opzetten met Docker

1. Bouw de Docker image:
   ```
   docker-compose build
   ```

2. Start de container:
   ```
   docker-compose up -d
   ```

3. Open [http://localhost:3000](http://localhost:3000) in je browser.

### Naar Docker Hub pushen

Je kunt de applicatie naar Docker Hub pushen om deze gemakkelijk op een server te deployen:

1. Zorg dat je bent ingelogd bij Docker Hub:
   ```
   docker login
   ```

2. Gebruik het build-en-push script:
   - Windows: `docker-push.bat`
   - Linux/Mac: `docker-push.sh`

### Deployen op een server

1. Plaats het `server-deploy.sh` script op je server.
2. Maak het script uitvoerbaar:
   ```
   chmod +x server-deploy.sh
   ```
3. Voer het script uit:
   ```
   ./server-deploy.sh
   ```

De applicatie zal beschikbaar zijn op `http://[server-ip]:3000`. 