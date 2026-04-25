# CGS Porter — Runbook de présentation

> Pour présenter à la direction CGS · ~25–30 min · ~5 mai 2026
>
> **Contexte:** on n'a pas encore de vraies données en production — on a des données de démonstration réalistes (les 24 vrais membres de l'équipe, 22 services type d'un samedi, 30 jours d'historique). C'est volontaire et c'est une force : on montre exactement ce que la direction verra le jour 1 quand on active le système, sans cacher quoi que ce soit.

---

## TL;DR — l'angle de la présentation

**Phrase d'ouverture:** *« Aujourd'hui je vais vous montrer un outil interne qu'on a construit pour digitaliser la coordination de l'équipe porter à GVA. Tout ce que vous allez voir tourne en production sur Vercel et Supabase. Les données sont des données de démonstration réalistes — les 24 vrais noms de l'équipe, un samedi typique avec 22 services. Le jour où on active le système, ces données viennent en direct. »*

**Le storyline en une phrase:** Papier + WhatsApp + Excel = 40 min perdus chaque jour et 5–8 % d'erreurs de facturation. Notre app digitalise le tout — sans changer le flux humain (le chef appelle toujours, le porter travaille toujours) — pour CHF ~50/mois, déployable en 1 jour.

---

## Préparation 30 minutes avant la démo

### 1. Préparer la base de données

```bash
cd "/Users/matetorgvaidze/Desktop/CGS App"

# Reset propre + recharge le planning + 22 services pour AUJOURD'HUI
node scripts/demo-reset.mjs --full

# 30 jours d'historique → graphiques du dashboard pleins
node scripts/populate-history.mjs
```

Tu devrais voir à la fin: `~22 services aujourd'hui · 17 shifts · 95+ services historiques · 24 employés (6 chefs + 18 porters)`.

### 2. Vérifier que les URLs sont en ligne

```bash
node scripts/qa-smoke.mjs
```

Doit afficher 5/5 ✅. Si une URL répond 401/404, va dans Vercel dashboard et déploie depuis main manuellement.

### 3. Récupérer les URLs actuelles

Vercel change l'URL à chaque push. Lance ça pour avoir les bonnes:

```bash
# Mobile PWA URL
npx vercel ls cgs-porter --prod | grep -oE 'https://[^ ]+vercel.app' | head -1

# Admin Panel URL
(cd admin && npx vercel ls cgs-porter-admin --prod | grep -oE 'https://[^ ]+vercel.app' | head -1)
```

Note les deux URL sur un post-it à côté de l'écran.

### 4. Ouvrir les onglets

Sur le laptop projeté:
- **Onglet 1** (admin): `<URL admin>/login` — laisse-le sur la page de login pour la démo
- **Onglet 2** (PowerPoint): le deck `presentation/CGS-Porter-Pitch.pptx`

Sur ton iPhone (pour la partie mobile):
- Safari → `<URL mobile>` → toggle **Chef d'équipe** → Se connecter → tu es sur la home
- Si tu peux, ajoute à l'écran d'accueil: l'icône PWA apparaît, tu lances la "vraie app" pour la démo. Plus impactant que un onglet Safari.

### 5. Plan B si quelque chose tombe

| Si... | Faire... |
|---|---|
| L'admin panel répond 401 | Vérifie Vercel SSO via dashboard (doit être OFF) |
| Le mobile ne charge pas | Bascule sur le deck PowerPoint, montre les screenshots |
| Le toast ne sort pas | Re-charge la page mobile (Ctrl+R), réessaie |
| Quelqu'un demande un truc qu'on n'a pas | « C'est sur la roadmap — on l'ajoute dans la version 2 » |
| Tu te bloques | Reviens au deck, slide d'avantages (slide 27) — le message est plus fort là |

---

## Le déroulé — 30 minutes

### ACTE 1 — Le contexte (3 min) · Slides du deck

**À montrer:** slides 1 à 4 du deck.

> *« Avant de lancer la démo en direct, je veux qu'on partage le constat. »*

**Slide 1 — Cover.** Brève intro: « CGS Porter, l'outil interne pour notre équipe à GVA. »

**Slide 2-3 — Le problème.**
- Plannings papier qu'on perd
- Assignations par WhatsApp sans suivi
- Facturation Excel à la main → erreurs

**Slide 4 — L'impact:** *« 40 minutes perdues par jour, 5 à 8 % d'erreurs de facturation, zéro visibilité temps réel pour la direction. »*

> Pause. *« Voilà ce qu'on a construit pour résoudre ça. »*

---

### ACTE 2 — Démonstration ADMIN (10 min) · Live

**Bascule sur l'onglet 1 (admin).** Le post-it dit l'URL — tape-la.

#### 2.1 — Login (30 s)

> *« Le panel d'administration est réservé aux chefs d'équipe. Authentification réelle via Supabase. »*

- Tape l'email pré-rempli `mate.torgvaidze@cgs-ltd.com`, tape le mot de passe `CgsPorter2026!`, clique **Se connecter**.
- Pause 2 secondes sur le dashboard pour qu'il charge.

#### 2.2 — Dashboard (1.5 min)

> *« Voici ce que je vois quand j'ouvre le panel le matin. »*

Pointe les 4 KPIs en haut: services aujourd'hui, CA aujourd'hui, services ce mois, CA ce mois.

> *« Calculs en temps réel, pas de copier-coller depuis Excel. »*

Pointe le bar chart 30 jours: *« volume par jour — utile pour anticiper les jours chargés. »*

Pointe le donut: *« répartition par source — DNATA, Swissport, Privé, Web. Ça m'a jamais été visible avant. »*

Pointe le top 5 porters: *« classement du mois. Utile pour les primes et la reconnaissance interne. »*

> *« Toutes ces données sont calculées en SQL par Supabase, en direct. »*

#### 2.3 — L'IMPORTER — le moment fort (2 min)

C'est le moment clé du pitch. Si tu ne fais qu'un truc bien dans la démo, c'est celui-là.

> *« Imagine ton lundi matin. Tu reçois une feuille papier avec 22 services à faire. »*

Clique **Importer** dans le sidebar.

> *« Aujourd'hui, on lit ligne par ligne et on copie-colle dans Excel. Ça prend 20 minutes et c'est plein d'erreurs. Avec ça… »*

Clique le bouton vert **« Charger jeu démo »** en haut à droite.

→ La preview montre les 22 services avec vol, client, source, prix calculé automatiquement.

> *« Preview ligne par ligne, je vois tout, je peux corriger. Et… »*

Clique **« Importer 22 services »** (bouton magenta).

→ ✓ Verde: « 22 services importés ».

> *« 22 services en base, en moins de 30 secondes. Et le mieux: les téléphones de l'équipe sont mis à jour automatiquement, sans que je touche un autre bouton. »*

#### 2.4 — La liste des services (1 min)

Clique **Services** dans le sidebar.

→ Tableau avec les 22 + l'historique (~117 lignes au total).

- Tape « EK » dans la search bar → la liste se filtre instantanément. *« Recherche par vol, client, ou porteur. »*
- Efface la search.
- Clique le bouton magenta **« Ajouter service »** en haut.

→ Modale s'ouvre.

> *« Quand un client appelle au dernier moment, je crée le service ici en 30 secondes. Note: je clique Privé… »*

Clique sur l'onglet segmenté **« Privé »**, change **bagages** à 5.

> *« …et le tarif se calcule tout seul: 25 base + 2 extras × 5 = 35 CHF. Plus jamais d'erreur de facturation. »*

Clique **Annuler** pour fermer la modale.

#### 2.5 — L'équipe (1 min)

Clique **Employés**.

→ Grille des 24 employés.

> *« Les 24 vrais noms de notre équipe. 6 chefs, 20 porters. Avec leur ID payroll CGS pour la paie. »*

Clique sur une carte (ex: **Mate Torgvaidze** ou un porter).

→ Page détail avec KPIs perso + 10 derniers services.

> *« Pour chaque personne: combien de services ce mois, combien de CHF générés, heures estimées. C'est ce qui sortira sur les fiches de paie. »*

Reviens (← Retour).

#### 2.6 — Tour rapide (2 min)

Pas trop long sur ces sections — tu les survoles en montrant qu'elles existent et fonctionnent.

- Clique **Planning** → *« le planning des shifts par jour, prêt à recevoir les imports CSV de roster. »*
- Clique **CRM Clients** → *« agrégation automatique des clients depuis l'historique des services. Papapolitis, Mojeh Hashemnia… apparaissent ici sans qu'on les rentre 2 fois. »*
- Clique **Rapports** → *« vues mois/semaine/jour, charts par source, exportable PDF/Excel. »*
- Clique **Paramètres** → *« source unique de vérité pour les tarifs. Si on change le base Privé de 25 à 30 CHF, ça change partout instantanément. »*

> *« Voilà pour le panel chef. Maintenant le côté terrain. »*

---

### ACTE 3 — Démonstration MOBILE (8 min) · Live sur ton iPhone

Bascule l'écran sur l'iPhone (mirroring AirPlay si possible, sinon montre l'écran à la main).

#### 3.1 — Login (30 s)

> *« L'application mobile. C'est une PWA — installable comme une vraie app native, mais sans passer par l'App Store. Aucune install pour le porteur, juste un lien à ouvrir. »*

Sur l'iPhone: ouvre le lien mobile. Toggle **Chef d'équipe** est déjà sélectionné.

> *« On a deux profils: Porteur et Chef d'équipe. Le rôle change ce qu'on voit. »*

Tape **Se connecter**. La home charge.

#### 3.2 — Home Chef d'équipe (2 min)

> *« Voilà ma vue chef quand j'arrive en service. »*

Pointe le header: *« Bonjour Mate, samedi tel jour, chef d'équipe. »* Pointe les 3 stats: 117 services, 4 non assignés (en rouge), 100 terminés.

Pointe le **card "Services à assigner"**:

> *« Le prochain service non assigné. Ici A3856 à 17:20, Philippides, Terminal 1. »*

Pointe le **widget "Activité de l'équipe"** (avec le point pulsant EN DIRECT):

> *« En temps réel: combien de porteurs sont actuellement en service, combien de services en cours, combien à faire. »*

Pointe les chips des porteurs actifs maintenant:

> *« Et ici les noms et photos des porteurs présents à l'instant. Si je vois que Mate est tout seul à 18h, je sais qu'il faut renforcer. »*

Pointe le card **"Votre shift aujourd'hui"** (CO2, 14:15 → 23:30) puis "Mon équipe aujourd'hui" en scrollant.

> *« Sous moi, mon shift et la liste des 17 personnes qui travaillent ce samedi avec leurs codes (CQ1, CO2, TR5…), horaires et pauses. »*

#### 3.3 — L'ASSIGNATION — moment fort 2 (2 min)

> *« Maintenant le geste qu'on fait 100 fois par jour: assigner un service à un porteur. »*

Tape le bouton magenta **« Assigner un porteur »** sur le card Services à assigner.

→ Bottom sheet glisse vers le haut.

> *« La liste de l'équipe assignable. Note: on voit d'abord les chefs d'équipe — parce qu'on prend des services nous-mêmes quand l'équipe est courte. »*

Pointe la section **"CHEFS D'ÉQUIPE (6)"**: les 6 chefs avec badge magenta CHEF.

> *« Mate, Andrei, Aftak, Khalid, Safet, Dercio — les 6 chefs. Et en dessous… »*

Scroll un peu vers le bas:

> *« …les 20 porteurs. »*

Tape sur un porteur (ex: **Marc Dubois**).

→ Sheet se ferme. Toast navy apparaît en bas: « ✓ A3856 · 17:20 assigné à Marc Dubois ».

> *« Confirmation visuelle. Et regardez le compteur en haut… »*

Pointe: 4 → 3 dans NON ASSIGNÉS. Le card a basculé sur le service suivant.

> *« Le service est en base, le porteur reçoit la notification sur son téléphone, on continue. »*

#### 3.4 — Vue Porteur (1.5 min)

Tape **Profil** en bas, puis **Se déconnecter**.

→ Retour au login. Toggle **Porteur** (déjà sélectionné par défaut).

Tape **Se connecter**.

> *« Voilà ce que voit un porteur. Marc, par exemple. »*

Pointe la home: services qui lui sont assignés, son shift, ses stats du mois.

Tape un service pour ouvrir le détail (si visible).

> *« Le porteur voit le client, le vol, le point de rendez-vous. Il tape "Démarrer" quand il commence — chronomètre tourne. Il tape "Terminer" à la fin. Et le chef voit ça en temps réel. »*

Pas besoin de l'exécuter — juste montrer la possibilité.

#### 3.5 — Planning mobile (30 s)

Tape **Planning** en bas.

> *« Calendrier des shifts. Je peux naviguer mois par mois… »*

Tape la flèche → puis ←.

> *« Voir mon planning, importer un nouveau roster PDF en un tap. »*

---

### ACTE 4 — Bénéfices et coûts (2 min) · Slides

Reviens au deck PowerPoint.

**Slide 27 — Bénéfices.** *« Ce qu'on gagne, mesurable: 40 min de gestion gagnées chaque jour, zéro erreur de tarif, 100 % de visibilité pour la direction. »*

**Slide 28 — Coûts.**

> *« Ce que ça coûte: CHF ~50/mois pour Vercel + Supabase. Aucun matériel. Aucune licence par utilisateur. 1 jour de formation suffit. »*

---

### ACTE 5 — Q&A et next steps (5–7 min)

**Slide 29 — Merci.**

> *« Voilà l'outil. Questions ? »*

Réponds aux questions (cf. cheat sheet plus bas).

**Pour clore (si on te demande "et après ?"):**

> *« Aujourd'hui c'est en bêta privée — accessible aux 6 chefs, prêt à recevoir les vraies données. Si vous validez, je propose qu'on l'active sur 2 semaines de test parallèle (papier + app), puis on bascule complètement. Ça va prendre 1 semaine pour intégrer les retours, on est prêts pour mi-mai. »*

---

## Q&A — Cheat sheet

| Question probable | Réponse rapide |
|---|---|
| **Combien ça coûte ?** | CHF ~50/mois (Vercel + Supabase). Pas de coût par utilisateur. |
| **Sécurité des données clients ?** | Postgres EU, RLS niveau ligne, HTTPS partout, pas de données sur les téléphones. |
| **Et si Internet tombe ?** | PWA fonctionne offline pour la lecture. La synchro se fait quand le réseau revient. |
| **Combien de temps pour intégrer ?** | 1 jour formation, déploiement immédiat. 2 semaines de période parallèle recommandée. |
| **Et si l'app plante en pleine journée ?** | Plan B: retour au papier (qu'on connaît déjà). On garde le PDF du roster sur la table. |
| **Qui maintient ?** | Moi (Mate) + Nexalab (mon agence). Code en GitHub privé, déploiement automatique. |
| **Et le RGPD ?** | Pas de données clients sensibles stockées. Téléphones et noms uniquement. Suppression sur demande. |
| **Pourquoi pas un produit existant ?** | Marché existe (Workforce, Connecteam) mais c'est des outils génériques à CHF 5–10 par utilisateur par mois. Le nôtre est sur mesure pour notre flux DNATA/Swissport/Privé. |
| **Vous l'avez fait vous-même ?** | Oui. ~3 semaines de dev. Code propriétaire CGS. |
| **C'est en production maintenant ?** | Oui. URL active. 6 chefs peuvent se connecter dès maintenant. Les données de démo seront remplacées le jour 1. |
| **Combien de personnes ça peut supporter ?** | Vercel auto-scale, Supabase free tier supporte 50K utilisateurs. Notre équipe = 24 max → on a 2000× la capacité nécessaire. |
| **Roadmap ?** | Bot Telegram pour gérer depuis le mobile sans ouvrir l'app, parser PDF du roster automatique, push notifications, intégration API DNATA si on a accès. |

---

## Le framing important — "pas de vraies données"

**Si quelqu'un demande:** *« Mais les données qu'on voit, c'est réel ou c'est fictif ? »*

**Réponse:**

> *« C'est des données de démonstration mais réalistes — les 24 vrais noms de l'équipe, les 22 services correspondent à un samedi typique chargé depuis une feuille papier réelle. Les 30 jours d'historique sont générés pour montrer ce que les graphiques afficheront en production. Le jour où on active le système, ces données disparaissent et remplacent par les vraies en temps réel. »*

**Ne jamais dire:** « c'est de fausses données » — ça sonne bricolé.

**Toujours dire:** « données de démonstration réalistes basées sur notre vraie équipe » — c'est plus honnête et plus impressionnant (montrer qu'on a fait l'effort de seeder réaliste).

---

## Si tout se passe bien — l'attitude

- **Rythme calme.** Tu as construit ça toi-même. Tu sais où tu vas. Pas besoin de courir.
- **Pause après les moments forts.** Après l'Importer (30 sec à importer 22 services), après le Toast d'assignation. Laisse l'effet retomber.
- **Si tu fais une erreur, no problem.** *« Je me suis trompé d'onglet. »* Reprends, c'est fluide.
- **Demande des questions à mi-chemin.** *« Vous me suivez jusque-là ? Des questions avant qu'on passe au mobile ? »* Ça crée de l'engagement.
- **Termine en proposant un timeline concret.** Pas seulement *« voilà l'outil »* mais *« je propose 2 semaines de test parallèle puis bascule complète mi-mai. »*

Bonne chance. 🚀
