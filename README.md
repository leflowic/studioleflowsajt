# Studio LeFlow

Profesionalni muzički produkcijski studio u Beogradu, Srbija.

Website za Studio LeFlow - home music studio koji nudi usluge snimanja, mix/master produkcije, izrade instrumentala i gotovih pesama.

## 🎵 Funkcionalnosti

- **Prikaz usluga**: Snimanje, Mix/Master, Instrumentali, Gotove pesme
- **Kontakt forma**: Zakazivanje termina sa automatskim email notifikacijama
- **Premium dizajn**: Tamna tema inspirisana muzičkom industrijom
- **Responsive**: Potpuno prilagođen za mobilne uređaje
- **Srpski jezik**: Kompletan sadržaj na srpskom (ćirilica i latinica)

## 🛠️ Tehnologije

### Frontend
- **React 18** sa TypeScript
- **Vite** - build tool
- **Tailwind CSS** - styling
- **shadcn/ui** - UI komponente
- **Wouter** - routing
- **TanStack Query** - server state management
- **React Hook Form + Zod** - form validation

### Backend
- **Express.js** sa TypeScript
- **Resend** - email notifikacije
- **Drizzle ORM** - database schema (konfigurisano za PostgreSQL)
- **In-memory storage** - trenutno skladištenje (može lako da se prebaci na bazu)

## 📋 Preduslovi

- **Node.js** 18.x ili noviji
- **npm** ili **yarn**

## 🚀 Lokalno pokretanje

### 1. Kloniranje projekta

```bash
git clone https://github.com/your-username/studio-leflow.git
cd studio-leflow
```

### 2. Instalacija zavisnosti

```bash
npm install
```

### 3. Konfiguracija environment varijabli

Kopiraj `.env.example` u `.env`:

```bash
cp .env.example .env
```

Otvori `.env` i podesi:

```env
RESEND_API_KEY=your_resend_api_key_here
SESSION_SECRET=your_random_secret_here
```

**Kako dobiti Resend API ključ:**
1. Registruj se na [resend.com](https://resend.com)
2. Idi na [API Keys](https://resend.com/api-keys)
3. Kreiraj novi API ključ
4. Kopiraj i zalepi u `.env`

### 4. Pokretanje development servera

```bash
npm run dev
```

Sajt će biti dostupan na: **http://localhost:5000**

## 📦 Build za produkciju

```bash
npm run build
```

Ovo kreira `dist/` folder sa kompajliranim kodom.

## 🌐 Deployment

Za deployment opcije i detaljne instrukcije, pogledaj **[DEPLOY.md](./DEPLOY.md)**.

### Brze opcije za deploy:

- **Render** ($7/mesec) - preporučeno ⭐
- **Railway** (~$5-8/mesec)
- **DigitalOcean App Platform** ($5/mesec)
- **Vercel** (besplatno za hobby projekte)

## 📁 Struktura projekta

```
studio-leflow/
├── client/                 # Frontend React aplikacija
│   ├── src/
│   │   ├── components/    # UI komponente
│   │   ├── pages/         # Stranice (Home, Contact, Terms)
│   │   ├── lib/           # Utility funkcije
│   │   └── App.tsx        # Main app
│   └── index.html
├── server/                # Backend Express server
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Storage interface
│   └── index.ts           # Server entry point
├── shared/                # Zajednički kod
│   └── schema.ts          # Zod schemas & types
├── attached_assets/       # Slike i mediji
└── package.json
```

## 📧 Email notifikacije

Svaki put kada neko popuni kontakt formu, automatski se šalje email na `leflowbusiness@gmail.com` sa:
- Izabranom uslugom
- Imenom klijenta
- Email adresom
- Telefonom
- Željenim terminom (opciono)
- Porukom

Email sistem koristi **Resend** servis i zahteva `RESEND_API_KEY` environment varijablu.

## 🗄️ Baza podataka

Trenutno aplikacija koristi **in-memory storage** (Map).

Za prebacivanje na PostgreSQL bazu:
1. Kreiraj PostgreSQL bazu
2. Dodaj `DATABASE_URL` u `.env`
3. Pokreni migracije: `npm run db:push`
4. Zameni `MemStorage` sa Drizzle ORM implementacijom u `server/storage.ts`

## 🔐 Sigurnost

- Svi korisnički inputi su HTML-escaped pre slanja u emailu
- Environment varijable nisu commited u Git
- Session secret za production sigurnost
- HTTPS automatski na deployment platformama

## 📝 Licenca

Privatni projekat - Sva prava zadržana © Studio LeFlow

## 📞 Kontakt

- Email: leflowbusiness@gmail.com
- Lokacija: Beograd, Srbija

---

Napravljeno sa ❤️ za Studio LeFlow
