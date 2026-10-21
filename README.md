# 🏷️ Resellio — il tuo gestionale per il reselling su Vinted

App web personale per comprare, prezziare e vendere su Vinted:
inventario con foto, calcolo prezzi e profitti, storico vendite,
lista delle occasioni da comprare e generatore di annunci pronti.

**I tuoi dati restano sul tuo dispositivo** (salvati nel browser),
nessun account, nessun server, nessuna installazione.

## ▶️ Come si avvia

1. Apri la cartella `resellio`
2. Fai doppio clic su **`index.html`** → si apre nel browser (Chrome, Safari, Edge…)
3. Primo utilizzo: premi **✨ Vedi un esempio** per capire come funziona, oppure aggiungi subito il tuo primo articolo

Consiglio: crea un collegamento sulla scrivania o usa la funzione
"Installa app / Aggiungi a Schermata Home" del browser, così la apri come un'app.
Per salvare i dati più duraturi conviene aprire l'app dal browser Chromium/Chrome
(la modalità "incognito" non salva nulla).

## 📦 Cosa contiene

| Sezione | A cosa serve |
|---|---|
| 📊 **Dashboard** | Guadagni del mese, profitto potenziale, capitale investito, grafici, ultime vendite |
| 🧥 **Inventario** | Ogni capo con foto, brand, taglia, condizione, costo, prezzo e stato (Da fotografare → Da pubblicare → In vendita → Venduto) |
| 🧮 **Prezzi & profitti** | Quanto far pagare: inserisci il costo e il margine, ottieni il prezzo consigliato (con arrotondamento .99), il prezzo di pareggio, il ROI e un confronto tra margini |
| 💰 **Vendite** | Registra le vendite con 💰: storico con profitto e ROI per articolo, andamento mensile, filtri per periodo |
| 🛒 **Lista acquisti** | Le occasioni da cogliere (annunci Vinted, venditori privati, mercatini): prezzo chiesto → vendita attesa, priorità, stato della trattativa, e un click per passare l'acquisto all'inventario |
| 🔍 **Caccia occasioni** | Scrivi cosa vuoi comprare (es. "felpa carhartt"): l'app recupera gli annunci della ricerca Vinted e ti dice per ognuno se **✅ comprare / ⚠️ trattabile / ❌ non conviene**, con guadagno stimato e confronto con la media del mercato. Se il recupero automatico viene bloccato, incolli i risultati copiati e li analizza lo stesso |
| ✍️ **Genera annuncio** | Compila i dettagli del capo e ottieni titolo ottimizzato (≤60 caratteri), descrizione Vinted pronta e hashtag — con pulsanti "Copia" |

## 🔍 Come funziona la caccia occasioni

1. Nella sezione **🔍 Caccia occasioni** scrivi cosa cerchi e indichi **a quanto pensi di rivendere** quel capo (es. 40€) e il margine che vuoi (es. 40%)
2. L'app calcola la tua **soglia d'acquisto** (es. 24€) e preme **🔍 Recupera annunci da Vinted**
3. Per ogni annuncio trovi il verdetto con i motivi:
   - 🎯 sotto/ sopra la soglia d'acquisto
   - 💰 guadagno stimato e ROI oppure la perdita se lo compri a quel prezzo
   - 🔥/📊 se il prezzo è sotto o sopra la **media dei prezzi della ricerca** (il mercato reale)
4. Quelli buoni li mandi in un click nella **lista acquisti** con prezzo e link già compilati

> Nota: Vinted non offre un'API ufficiale e a volte blocca le richieste automatiche: in quel caso l'app te lo segnala e puoi **incollare i risultati copiati** dalla ricerca (titolo e prezzo per riga) — l'analisi è identica.

## 🔮 Analisi prezzo automatica

Ogni volta che aggiungi un articolo (o un'opportunità nella lista acquisti),
l'app ti dice subito il prezzo:

- **Nel modale articolo**: appena inserisci il costo di acquisto, vedi il **prezzo suggerito**,
  i costi totali, il prezzo di pareggio, il profitto e il ROI. Se indichi un prezzo di vendita,
  ti dice se è un ottimo prezzo, se puoi chiedere di più o se ci perdi — e con un click
  ✨ **Usa il prezzo suggerito** te lo compila.
- Se salvi **senza indicare un prezzo di vendita**, l'app lo compila da sola con quello suggerito
  e te lo dice nel messaggio di conferma.
- **Nel modale opportunità**: appena indichi a quanto pensi di rivendere, vedi il **massimo
  che conviene pagare** e, se inserisci il prezzo chiesto, il verdetto ✅ conviene / 🤝 trattabile / ❌ troppo caro.

## 📱 Versione Android

Resellio funziona su Android in due modi, scegli quello che preferisci:

### A) App installabile (PWA) — la più semplice

1. Apri l'indirizzo dell'app in **Chrome** sul telefono:

   **👉 https://giuseppelia890-tech.github.io/resellio/**

2. Tocca il **⋮** in alto a destra → **Installa app** (o "Aggiungi a schermata Home")
3. comparirà l'icona di Resellio sul telefono: si apre a schermo intero e funziona **anche offline**
   (i dati restano sul telefono, nel suo browser)

### B) File APK vero (Capacitor)

Un'app Android vera e propria, installabile trasferendo il file `.apk` sul telefono
(via cavo, email, WhatsApp, AirDrop…). Da Android: apri il file e consenti le installazioni
da origini sconosciute.

**APK già compilato, pronto da scaricare sul telefono:**

👉 **https://github.com/giuseppelia890-tech/resellio/releases/latest/download/app-debug.apk**

(apri l'indirizzo dal browser del telefono, poi apri il file scaricato e consenti
l'installazione da "origini sconosciute" quando te lo chiede)

Per ricompilarlo da zero (per esempio dopo aver cambiato qualcosa nei file dell'app):

```bash
cd resellio
npm run apk        # compila → android/app/build/outputs/apk/debug/app-debug.apk
```

Lo script `build-apk.sh` trova da solo Java 21 e lo SDK Android, copia i file dell'app
e lancia Gradle. La prima compilazione richiede qualche minuto (scarica Gradle),
le successive vanno molto più veloci.

Quando cambi qualcosa nei file dell'app (`js/`, `css/`, `index.html`…), ricompila con
`npm run apk` e trasferisci di nuovo l'APK sul telefono.

> Nota: nell'APK e nella PWA i dati sono salvati nel dispositivo, separati da quelli del browser.
> Usa ⬇️ **Esporta** / ⬆️ **Importa** per spostarli.

### Com'è fatta la grafica, e perché su Android ora si vede bene

Resellio usa **una sola grafica** in stile **Material Design 3 versione scura**, con card
arrotondate, chip, pulsante flottante, barra di navigazione in basso con l'indicatore a pillola
e numeri monospaziati. Cambia solo la **disposizione**, che si adatta allo schermo:

| | Telefono (fino a 900px) | Computer (oltre 900px) |
|---|---|---|
| Navigazione | barra in basso | barra laterale |
| Contenuti | una colonna, pulsanti grandi | griglia a più colonne |
| Modali | foglio che sale dal basso | finestra centrata |
| Tabella vendite | lista di schede | tabella |

Prima l'app su Android sembrava "in modalità desktop" per due motivi, entrambi sistemati:

1. **I breakpoint erano troppo alti** (720px e 980px): un telefono in verticale è largo
   ~360–430px, quindi restava nel layout da desktop. Ora il layout da telefono parte da
   **900px** e quello per telefoni stretti da **560px**.
2. **La finestra dell'APK non era configurata**: in `capacitor.config.json` mancavano le
   impostazioni del WebView (schermo intero, gestione tastiera, barra di stato scura, margini
   per gli schermi con angoli arrotondati). Ora ci sono.

## 👤 Account online (Google o email)

Resellio può avere un **account vero**, con accesso via **Google** o **email e password**:

- all'apertura appare la schermata di accesso: un click su **Continua con Google** e sei dentro
- puoi anche creare un account con email e password, o recuperare la password dimenticata
- una volta entrato, **resti dentro**: non serve rifare l'accesso a ogni apertura
- i dati restano sempre salvati sul dispositivo, ma vengono **copiati anche online**:
  se cambi telefono basta accedere con lo stesso account per ritrovarli
- l'indicatore **☁️** in alto mostra lo stato del backup

> Per attivare l'account serve creare un progetto gratuito su Firebase (5 minuti):
> le istruzioni passo passo sono in cima a `js/firebase-config.js`.
> Finché non è configurato, Resellio funziona come prima: blocco locale con password.

### Come funziona senza internet

- sei già entrato prima → l'app si apre lo stesso (l'accesso viene ricordato)
- mai entrato e sei offline → puoi entrare con la **password locale**, se l'hai impostata
- i dati si modificano anche offline e vengono inviati online alla connessione successiva

## 🔒 Blocco con password

Da ⚙️ **Impostazioni** puoi attivare una **password di accesso** (almeno 4 caratteri):

- all'apertura dell'app appare la schermata di blocco con il campo password
- funziona anche **offline** ed è **uguale** nella versione web e nell'APK
- la password si resetta **chiudendo l'app**: ogni volta che la riapri te la chiede
- serve a tenere fuori mani curiose dal tuo telefono: **non è un account** e non c'è
  un server che possa recuperarla. Se la dimentichi, l'unica via è toglierla dalla
  schermata stessa ("Hai dimenticato la password?") — i dati restano al loro posto
- la password **non** finisce nei backup esportati

## ⚙️ Impostazioni

Da ⚙️ **Impostazioni** puoi regolare:

- **Commissioni Vinted %** (0 di default per i venditori su Vinted IT)
- **Margine default %** usato dal calcolatore
- **Arrotondamento prezzi** (.99, .95 o esatto)
- **Nota spedizione** predefinita degli annunci
- **🔒 Blocco con password**: attiva, cambia o togli la password (vedi sopra)
- **👤 Account online**: sincronizza ora o esci dall'account

## 💾 Backup e ripristino

- **⬇️ Esporta**: scarica un file `.json` con tutti i tuoi dati
- **⬆️ Importa**: ricarica quel file (anche su un altro dispositivo)
- Fai un backup ogni tanto: i dati sono salvati solo nel browser di questo computer

## 📸 Suggerimenti per le foto

Le foto vengono ridimensionate automaticamente (max 900px) e compressi
prima del salvataggio, per non riempire la memoria del browser.
Una foto chiara con sfondo neutro funziona meglio di dieci foto scure.

---
Fatto con ❤️ per aspiranti reseller. Buone vendite! 🚀
