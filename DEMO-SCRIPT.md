# Guión de demo — CGS Porter Service

> Para presentar a tus superiores. ~6 minutos en total.

## Setup previo (haz esto 1 minuto antes)

1. Abre 2 ventanas de navegador:
   - Pestaña 1 (proyectada en pantalla grande): **Admin Panel**
   - Pestaña 2 (en tu iPhone o segunda pestaña): **App móvil**
2. Pestaña 1: ve al admin → login con `mate.torgvaidze@cgs-ltd.com` / `CgsPorter2026!` → quédate en el Dashboard.
3. Pestaña 2: ve a la app móvil → toggle [Porteur | Chef d'équipe] = **Porteur** → "Se connecter" → te identifica como Marc Dubois (ahora será uno de los porteurs reales del roster, ej. **Mane Aliou** o **Imad Moukni**).

> Si quieres limpiar antes la BD: `node scripts/run-sql.mjs` con `truncate table public.services cascade;` desde Terminal.

---

## Acto 1 — "Esto es lo que hacemos cada mañana hoy" (1 min)

**Frase de apertura**: *"Cada mañana, los chefs d'équipe recibimos dos hojas en papel: el roster de los porteurs y la lista de servicios del día. Las miramos, llamamos por teléfono, y asignamos a mano. Hoy os enseño cómo lo digitalizamos."*

Muestra fotos en pantalla:
- IMG_0228 (roster con 24 nombres + horarios + clockings + comments)
- IMG_0229 (lista de 22 servicios PRIVE/DNATA/SWP/GUICHET con vuelos y nombres VIP)

> Pausa. *"Ahora pasamos al sistema."*

---

## Acto 2 — "Importer los servicios en 10 segundos" (1 min)

1. En el Admin → click **Importer** en el sidebar.
2. Click el botón verde **"Charger jeu démo"** arriba a la derecha.
3. Aparece la tabla con los 22 servicios reales del 01/03/2026 — los mismos de la foto.
4. Click magenta **"Importer 22 services"**.
5. ✓ Verde aparece: "22 services importés".

**Frase**: *"En vez de leer una hoja en papel y memorizarla, en 10 segundos están todos en el sistema. Los porteurs ya los pueden ver en su móvil — instantáneamente."*

---

## Acto 3 — "Lo que ven los porteurs" (1 min)

1. Cambia a la pestaña 2 (móvil).
2. La pantalla del porter ya se actualizó automáticamente vía realtime — sin recargar.
3. Muestra: home con "0 services aujourd'hui" → tras la asignación verán los suyos.

**Frase**: *"Sin email, sin grupo de WhatsApp, sin teléfono. El porteur abre el app y ve lo que tiene que hacer."*

---

## Acto 4 — "Asignar por teléfono pero registrar en el sistema" (1.5 min)

1. Vuelve al Admin → **Services** en el sidebar.
2. Verás los 22 servicios. La columna "Porteur" muestra "Non assigné" en rojo para todos.
3. Click el **lápiz** (editar) del servicio #17 EK089 SAM 4BAGS.
4. En el modal: dropdown "Assigné à" → escoge un porteur del roster real (ej. **Imad Moukni** que estaba en CAMIONETTE).
5. Click **Enregistrer**.
6. Vuelve al móvil — ese porteur ahora ve EK089 en su lista.

**Frase**: *"Llamo a Imad por teléfono — eso no cambia, sigue siendo confianza humana. Pero ya no escribo nada en papel. Imad recibe el servicio en su app, la app le calcula el precio según los bagages, y al terminar marca DÉMARRER → TERMINER. Yo veo todo en directo desde el dashboard."*

---

## Acto 5 — "El dashboard del jefe" (1 min)

1. Vuelve al Admin → **Dashboard**.
2. Métricas en vivo: services aujourd'hui (22), CA aujourd'hui (CHF auto-calculé), services ce mois, CA ce mois.
3. **Bar chart** de servicios por día (últimos 30 días).
4. **Donut** repartido por source: PRIVE / DNATA / Swissport / GUICHET.
5. **Top 5 porteurs** del mes — ranking por servicios completados.

**Frase**: *"A fin de mes, ya no calculo nada a mano. Veo automáticamente cuánto ha generado cada porteur, qué fuentes nos traen más volumen, y dónde están los cuellos de botella."*

---

## Acto 6 — "El planning y los rapports" (30 s — opcional)

- Click **Planning** → muestra que está preparado para la importación del PDF roster (en desarrollo).
- Click **Rapports** → date range + 4 KPIs + tabla por source + gráfica de tendencias 90 días.
- Click **CRM Clients** → agregación automática de los clientes que han hecho reservas (ej. Papapolitis, Mojeh Hashemnia).

**Frase**: *"Y ya tenemos las bases para CRM y reporting financiero. Cuando importamos los servicios, automáticamente tenemos la lista de clientes que han usado nuestro servicio."*

---

## Cierre — "Hoja de ruta" (30 s)

| Estado | Feature |
|---|---|
| ✅ Live | Login chef + porter, importer CSV, dashboard, services CRUD, gestion empleados |
| 🟡 Próximo | Parser PDF del roster (auto), notificaciones push al móvil cuando se asigna, app del cliente final con QR |
| 🔵 Long-term | Apps Script webhook desde el formulario web → entra automáticamente, integración API DNATA / Swissport |

**Frase final**: *"En esencia: digitalizar lo que ya hacemos sin cambiar el flujo humano. El chef sigue llamando, el porteur sigue trabajando. Solo dejamos de escribir en papel y empezamos a tener visibilidad real."*

---

## Atajos durante la demo

| Si pasa esto | Tecla / Acción |
|---|---|
| El móvil no se actualiza en tiempo real | Recarga la pestaña — la suscripción realtime se reconecta |
| Quieres re-empezar limpio | Terminal: `echo 'truncate table public.services cascade;' \| node scripts/run-sql.mjs -` |
| Te preguntan "¿esto está en producción?" | Sí — está en Vercel (HTTPS), Supabase (Postgres EU + RLS), código en GitHub privado |
| ¿Coste? | Vercel free tier + Supabase free tier hasta 50K usuarios. Para producción real probablemente €25/mes |
| ¿Cuántas personas pueden usarlo simultáneamente? | Vercel auto-escala, Supabase realtime aguanta hasta ~200 conexiones simultáneas en plan free |
