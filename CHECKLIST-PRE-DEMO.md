# 🎯 Checklist técnico antes de la demo — CGS Porter

> **Cuándo usarlo**: la mañana del 1 de mayo (o el día que sea la demo).
> **Tiempo total**: ~10 minutos siguiendo todo al pie de la letra.
> **Complementa**: `DEMO-SCRIPT.md` (que es el guion de qué decir durante la demo).

Tachá las casillas conforme avances. Si **algo falla**, salta a la sección 🆘 Troubleshooting al final.

---

## 📅 La noche anterior (10 min)

- [ ] **1.1** Abrir terminal y entrar al proyecto:
  ```bash
  cd "/Users/matetorgvaidze/Desktop/CGS App"
  ```

- [ ] **1.2** Asegurarse de que el código está al día con `main`:
  ```bash
  git pull origin main
  ```

- [ ] **1.3** Pasar la qa-loop completa (verifica BD + builds + producción):
  ```
  pasa la qa-loop
  ```
  (Esto tarda ~3 min. Tienes que ver al final: `🟢 N auto-fixed` + `🔴 0 alerts` + smoke verde post-deploy.)

- [ ] **1.4** Si la qa-loop reporta 🔴 alerts → **NO ignorar**, llamar a Claude para arreglar antes del día.

- [ ] **1.5** Cargar el iPhone al 100% + apuntar la URL móvil en una nota.

---

## 🌅 30 minutos antes de la demo

### 2A. Limpiar BD + sembrar datos frescos

- [ ] **2.1** Abrir terminal:
  ```bash
  cd "/Users/matetorgvaidze/Desktop/CGS App"
  ```

- [ ] **2.2** **Comando único** que limpia + siembra todo:
  ```bash
  node scripts/demo-reset.mjs --full
  ```

  Tiene que mostrar al final algo como:
  ```
  📊  Final state:
     { chefs: 6, porters: 21, shifts: 17, services: 22, clients: 0 }
     ✓ pre-assigned 3 services to Marc Dubois (demo porter)
  ✅  Demo state ready.
  ```

  Esto deja la BD así:
  - **22 servicios** del día (3 ya asignados a Marc para la demo móvil, 19 sin asignar para que el chef los asigne en directo)
  - **17 shifts** (planning del día con códigos CO2, CQ1, etc.)
  - **6 chefs** + **21 porters** (no se tocan, siguen ahí)

- [ ] **2.3** Verificar URLs vivas de producción:
  ```bash
  npx vercel ls cgs-porter --prod | grep -oE 'https://[^ ]+\.vercel\.app' | head -1
  cd admin && npx vercel ls cgs-porter-admin --prod | grep -oE 'https://[^ ]+\.vercel\.app' | head -1 ; cd ..
  ```

  Anota las dos URLs en una nota (ya las tienes en la barra de favoritos del navegador, mejor).

  > ⚠️ Las URLs hash-based cambian con cada push. Mejor usa los **aliases canónicos**:
  > - Mobile: `https://cgs-porter.vercel.app`
  > - Admin: `https://cgs-porter-admin.vercel.app`

### 2B. Verificación final (smoke test rápido)

- [ ] **2.4** Smoke test contra producción (10 segundos):
  ```bash
  node scripts/qa-smoke.mjs
  ```

  Tiene que terminar con:
  ```
  — Summary —  ✓ no failures · 0 warnings
  ```

  Si hay un ✗, **NO empezar la demo** sin diagnosticar. Llamar a Claude.

---

## 🎬 5 minutos antes — abrir las apps

### 3A. Admin Panel (Mac / Mate)

- [ ] **3.1** Abrir Chrome o Safari → URL admin → debería abrir login screen.

- [ ] **3.2** Login con:
  - Email: `mate.torgvaidze@cgs-ltd.com`
  - Password: `CgsPorter2026!`

- [ ] **3.3** Verificar que el dashboard muestra:
  - **22** en "Services aujourd'hui"
  - **CHF 465** en "CA aujourd'hui"
  - Sidebar con 7 items (Dashboard / Services / Importer / Employés / Planning / CRM Clients / Rapports / Paramètres)
  - Tabla "5 derniers services aujourd'hui" con vuelos visibles

### 3B. Mobile (iPhone / Marc)

- [ ] **3.4** **CRÍTICO si has tenido problemas antes — purgar cache iOS Safari**:
  - Ajustes → Safari → **Borrar historial y datos de sitios web** → Borrar
  - Cerrar Safari completamente (swipe up, deslizar Safari hacia arriba)

- [ ] **3.5** Abrir Safari → pegar URL móvil → debería abrir login screen "Porter Service GVA".

- [ ] **3.6** Toggle "Porteur" (Marc Dubois pre-rellenado) → tocar **Se connecter**.

- [ ] **3.7** Verificar que aparece:
  - "Bonjour Marc 👋"
  - **VOTRE PROCHAIN SERVICE** card con SWISS AIR · 05:30
  - Botón rosa **"Voir le service"**
  - Tab inferior: Accueil / Services / Planning / Profil
  - Bell de notificaciones (🔔) con badge

### 3C. Mobile chef (Mate)

- [ ] **3.8** Logout en mobile (Profil → Se déconnecter).

- [ ] **3.9** Cambiar toggle a "Chef d'équipe" → Se connecter → ver vista chef.

(Esto es opcional pero te asegura que ambos roles funcionan.)

---

## ✅ Verificación de los 3 caminos críticos de la demo

- [ ] **4.1** **Admin chef asigna un servicio**: en `/services` → click en un servicio sin asignar → modal → seleccionar un porter → guardar. Debería aparecer en la tabla como "asignado".

- [ ] **4.2** **Mobile porter recibe**: con el iPhone logueado como Marc, dejarlo en la pantalla "Services" — el servicio recién asignado debería aparecer **en menos de 1 segundo** vía Realtime.

- [ ] **4.3** **Mobile porter completa**: tap en uno de los 3 servicios de Marc → tap "DÉMARRER" → esperar 3 segundos → tap "TERMINER" → status pasa a "Terminé".

- [ ] **4.4** **Admin ve el cambio**: volver al admin → Dashboard → "Services ce mois" debería incluir el recién terminado, "CA aujourd'hui" actualizado.

---

## 🎤 Durante la demo — comandos de emergencia

Si algo se rompe en directo:

| Síntoma | Comando rápido (di "un momento" + abre terminal) |
|---|---|
| Dashboard vacío en admin | `node scripts/demo-reset.mjs --full` |
| Mobile no muestra servicios | Refrescar pestaña Safari (no purgar cache durante demo) |
| Porter no recibe asignación en directo | Recargar mobile + chequear que el chef seleccionó el porter correcto |
| Botón "Se connecter" no hace nada | iPhone: cerrar Safari + reabrir con URL canónica |

---

## 🆘 Troubleshooting (problemas comunes)

### ❌ "demo-reset.mjs falla con error de conexión"

- Verificar `.env.local` tiene `SUPABASE_PROJECT_REF` y `SUPABASE_PERSONAL_ACCESS_TOKEN`.
- Verificar internet (la API de Supabase Management está en `api.supabase.com`).

### ❌ "qa-smoke falla con 'MODE DÉMO banner detected'"

- Significa que las env vars de Vercel no están propagadas → re-deploy desde Vercel dashboard o `git commit --allow-empty -m "redeploy" && git push`.

### ❌ "Marc no me deja entrar en el móvil"

1. ¿Estás intentando entrar al ADMIN con Marc? Marc es **porter**, NO chef → solo entra al móvil.
2. Service worker stale → Ajustes → Safari → **Borrar historial y datos**.
3. URL antigua cacheada → usa el alias canónico `cgs-porter.vercel.app`.

### ❌ "El admin login da error 'Invalid credentials'"

- Verificar password EXACTA: `CgsPorter2026!` (con `!` y la `C` mayúscula).
- Verificar email sin typos: `mate.torgvaidze@cgs-ltd.com`.
- Si sigue fallando: rotar password en Supabase dashboard → Auth → Users.

### ❌ "El chart está vacío en el dashboard"

- Es normal si no hay datos históricos. Para llenarlo:
  ```bash
  node scripts/populate-history.mjs
  ```
  Esto añade 30 días de servicios pasados terminados (~150 services).

### ❌ "No tengo internet en el sitio de la demo"

- **Tener un screenshot pre-grabado de cada pantalla** en una carpeta `presentation/screenshots/`.
- Estos ya existen — abre `presentation/CGS-Porter-Pitch.pdf` como fallback.

---

## 📋 Resumen de **2 comandos** para correr el día

Si tienes **prisa máxima**:

```bash
cd "/Users/matetorgvaidze/Desktop/CGS App"
node scripts/demo-reset.mjs --full      # ← limpia BD + siembra (4 segundos)
node scripts/qa-smoke.mjs               # ← verifica producción (10 segundos)
```

Si los 2 dan ✓ → **estás listo**. Abre admin + mobile + presenta.

---

## 🔑 Credenciales de bolsillo

> Pega esto en una nota del iPhone para tenerlo a mano durante la demo.

```
Universal password: CgsPorter2026!

ADMIN PANEL:
  https://cgs-porter-admin.vercel.app
  → mate.torgvaidze@cgs-ltd.com

MOBILE:
  https://cgs-porter.vercel.app
  → toggle "Porteur"  = Marc Dubois (3 servicios)
  → toggle "Chef"     = Mate Torgvaidze
```

---

## 📞 Si todo lo demás falla

1. **No entres en pánico** — la BD está respaldada, Vercel tiene snapshots de cada deploy.
2. Abre Claude Code en una sesión nueva: di "**comprueba que no haya fallos**" → la skill `cgs-qa-loop` corre el diagnóstico completo.
3. Si la demo es en menos de 10 min y nada funciona: muestra `presentation/CGS-Porter-Pitch.pdf` como respaldo y explica que estás afinando la versión live.

---

**Última actualización**: 2026-04-26 (post-skill `cgs-qa-loop`)
**Versión app**: v2.4.1 (commit `2fd541e`)
**Producción al 100% verde** ✓ · verificado con qa-loop run #3 + Playwright end-to-end manual
