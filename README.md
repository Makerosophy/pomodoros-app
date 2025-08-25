# Tempo

Applicazione Pomodoro con interfaccia moderna, realizzata con React, TypeScript, Vite e Tailwind CSS.

### Requisiti
- Node.js 18+ (consigliato LTS)

### Installazione
1. Clona il repository
   ```bash
   git clone <URL_DEL_REPO>
   cd pomodoros-app
   ```
2. Installa le dipendenze
   ```bash
   npm install
   ```
3. Avvia l'ambiente di sviluppo
   ```bash
   npm run dev
   ```
   L'app sarà disponibile su `http://localhost:5173`.

### Build di produzione
```bash
npm run build
npm run preview
```
Il comando `preview` serve a testare localmente la build prod su `http://localhost:4173`.

### Funzionamento dell'app
- **Modalità**: scegli se lavorare a tempo (Workday) o a numero di cicli (Cycles).
- **Impostazioni timer**: imposta secondi per Pomodoro, pause brevi/lunghe, durata giornata, e ogni quanti Pomodori fare una pausa lunga. Premi "Apply Settings" per applicare.
- **Controlli**: Avvia giornata, Sospendi, Reimposta.
- **Tema**: due temi disponibili: Scuro (blu) e Chiaro (oro).
- **Avanzamento**: visualizza stato corrente, tempo rimanente, progressione giornata/cicli, e anteprima della sequenza.

### Struttura del progetto (principali)
- `src/App.tsx`: composizione dell'app e gestione stato principale.
- `src/components/TempoFrame.tsx`: contenitore UI del display.
- `src/components/Timer.tsx`: countdown con animazione `requestAnimationFrame`.
- `src/components/TimerSettings.tsx`: impostazioni di durata e modalità.
- `src/components/WorkdayProgress.tsx`: avanzamento giornata/cicli.
- `src/components/SchedulePreview.tsx`: anteprima sequenza timer/pause.
- `src/utils/audio.ts`: suoni e annunci vocali.

### Script disponibili
- `npm run dev`: avvia dev server Vite.
- `npm run build`: compila TypeScript e crea la build prod.
- `npm run preview`: serve la build prod per test locale.
- `npm run lint`: esegue ESLint.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
