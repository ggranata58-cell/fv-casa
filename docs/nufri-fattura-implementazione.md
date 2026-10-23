# Inserimento fattura Nufri — piano di rilascio

## Stato
Questa modifica è isolata nel ramo `nufri-fattura-protetta`. Non è pubblicata nell'app attiva e non modifica i dati.

## Requisiti di sicurezza
- Il browser deve avere una sessione Supabase Auth valida; la chiave publishable non è un'identità utente.
- La Edge Function deve verificare il token con `auth.getUser(token)`.
- L'utente deve corrispondere all'identità proprietaria configurata come segreto server `FV_CASA_OWNER_USER_ID`. Non inserire UUID o service-role key nel JavaScript.
- La funzione deve accettare solo POST JSON, mese `YYYY-MM-01), due importi numerici non negativi, importi limitati a due decimali e un corpo di dimensione limitata.
- Scrivere i due valori fattura in una singola operazione controllata; il trigger esistente deve finalizzare il risparmio e aggiornare i cumulati. In caso di errore non dichiarare il mese definitivo.
- Nessuna policy anon di scrittura e nessuna esposizione della service-role key al client.

## Flusso richiesto
1. L'app mostra una sezione “Fattura Nufri”.
2. L'utente seleziona il mese e inserisce costo senza FV e costo con FV, entrambi IVA inclusa.
3. Una schermata di conferma mostra mese, entrambi i valori e la differenza.
4. La funzione protetta salva i dati; l'app rilegge i dati e mostra lo stato definitivo solo dopo conferma del server.
5. Se non c'è sessione valida o manca la configurazione proprietario, la scrittura viene rifiutata in modo esplicito.

## Verifiche prima della pubblicazione
- sessione assente / token non valido: 401;
- utente non proprietario: 403;
- mese o importi non validi: 400;
- fattura valida: valori salvati, differenza corretta e cumulati successivi ricalcolati;
- errore database: messaggio di errore e nessuna conferma falsa;
- test con settembre 2026: €63,27 senza FV, €19,52 con FV, risparmio FV €43,75;
- controllare che l'app pubblicata e i dati esistenti non siano stati modificati durante i test.

## Blocco attuale
La versione pubblicata dell'app non implementa un flusso di accesso Supabase Auth nel browser. La funzione di lettura esistente usa la chiave publishable come Bearer token, che non deve essere considerato prova dell'identità dell'utente. Prima di abilitare l'inserimento fatture occorre integrare e collaudare il login senza interrompere la lettura attuale; solo dopo si può attivare la funzione di scrittura.
