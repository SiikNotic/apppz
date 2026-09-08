# Nero Pizza Co. — App de Dark Kitchen

Aplicación completa para una pizzería dark kitchen (solo delivery/pickup, sin
local físico para clientes): incluye la **app de pedidos para clientes** y el
**panel administrativo** para gestionar inventario, menú, pedidos y reportes
de ventas.

El estilo visual está inspirado en el [Figma de referencia](https://www.figma.com/design/g8YHO0ojrEDOiVOegfYdQT/Pizza-App-%7C-Online-Food-Delivery-App--Community-)
(paleta naranja/crema, tarjetas redondeadas, flujo de "arma tu pizza" en 2 pasos).

## Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript, exportado
  como sitio 100% estático (`output: 'export'`)
- **UI:** Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com) (Radix primitives: Dialog, Select, Tabs, Checkbox, Label) + Lucide Icons
- **Backend:** Supabase (Postgres + Auth + Realtime), acceso directo desde el
  cliente con Row Level Security
- **Gráficas:** Recharts (solo se cargan en el panel de reportes)
- **Hosting:** GitHub Pages, desplegado automáticamente con GitHub Actions

## Deploy en GitHub Pages

El repo ya trae el workflow `.github/workflows/deploy-pages.yml`: en cada
push a `main` (o a la rama de este proyecto) construye el sitio con
`next build` (modo `output: export`) y lo publica en GitHub Pages con las
acciones oficiales `upload-pages-artifact` + `deploy-pages`.

**Paso manual único** (GitHub no deja activarlo por API): en el repo, ve a
`Settings → Pages → Build and deployment → Source` y selecciona
**GitHub Actions**. Después de eso, cada push dispara el deploy solo y el
sitio queda publicado en `https://<tu-usuario>.github.io/apppz/`.

Como GitHub Pages es hosting puramente estático, la app corre 100% en el
navegador contra Supabase (no hay servidor Next.js ni rutas API) — por eso
`next.config.ts` fija `output: 'export'`, `images.unoptimized: true` y un
`basePath`/`assetPrefix` de `/apppz` que solo se activa cuando el build corre
dentro de GitHub Actions (variable `GITHUB_ACTIONS=true`); en local
(`npm run dev` / `npm run build`) la app sigue sirviéndose desde la raíz sin
ningún prefijo.

Si cambias el nombre del repo, actualiza el valor en `src/lib/base-path.ts`.

## Estructura

```
src/
  app/
    (customer)/          Grupo de rutas de la app de pedidos (layout con header + carrito)
      page.tsx            "/" — menú
      checkout/page.tsx   "/checkout"
      pedido/[orderId]/   "/pedido/:id" — seguimiento en tiempo real
    admin/
      login/page.tsx      "/admin/login" (público)
      (protected)/        Grupo protegido: valida sesión y muestra el layout con sidebar
        dashboard/ inventario/ menu/ pedidos/ reportes/
    layout.tsx            Layout raíz (fuente, providers)
    providers.tsx         AuthProvider + CartProvider ("use client")
    globals.css           Tema de Tailwind v4 + variables CSS de shadcn/ui
  components/
    ui/                   Componentes de shadcn/ui (button, card, dialog, select, tabs, table, badge, input, textarea, label, checkbox) + item-thumb, stat-card
    customer/              PizzaBuilderModal (flujo de personalización)
    admin/menu/            Tabs de gestión de menú (productos, categorías, toppings, masas/salsas)
  contexts/                AuthContext (sesión admin) y CartContext (carrito cliente, localStorage)
  hooks/                   useMenuData: trae categorías/productos/tamaños/toppings
  lib/                     cliente de Supabase, tipos, helpers de formato, config, cn()
```

### Rutas

| Ruta | Descripción |
| --- | --- |
| `/` | Menú de pedidos para clientes |
| `/checkout` | Carrito y datos de entrega |
| `/pedido/:id` | Estado del pedido en tiempo real |
| `/admin/login` | Inicio de sesión / creación de cuenta de staff |
| `/admin/dashboard` | Ventas del día, alertas de stock, pedidos recientes |
| `/admin/pedidos` | Gestión de pedidos (avanzar estado, cancelar, ver detalle) |
| `/admin/inventario` | CRUD de ingredientes + registro de entradas/salidas de stock |
| `/admin/menu` | CRUD de categorías, productos, tamaños, masas, salsas y toppings |
| `/admin/reportes` | Ventas por día y productos más vendidos |

## Cómo funciona el inventario automático

Cada producto (o cada tamaño, en el caso de "Arma tu Pizza") tiene una receta
en `recipe_ingredients` que indica cuánta masa/queso consume. Cada topping
tiene su propio consumo en `topping_ingredients`. Cuando un pedido pasa de
**Pendiente** a **Confirmado** en `/admin/pedidos`, la app calcula el consumo
total (`src/lib/inventoryDeduction.ts`) y descuenta automáticamente el stock
de `ingredients`, dejando un registro en `inventory_movements`.

Puedes editar las recetas directamente en Supabase (tablas
`recipe_ingredients` / `topping_ingredients`) o ampliarlas desde el SQL
editor del proyecto.

## Configuración

1. Copia `.env.example` a `.env.local` y coloca la URL y anon/publishable key
   de tu proyecto de Supabase:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   ```

2. Instala dependencias y levanta el proyecto:

   ```bash
   npm install
   npm run dev
   ```

3. Crea tu cuenta de administrador entrando a `/admin/login` → pestaña
   "Crear cuenta". Las cuentas nuevas entran con rol `staff`; para subir el
   rol a `admin` corre en el SQL editor de Supabase:

   ```sql
   update profiles set role = 'admin' where id = '<uuid-del-usuario>';
   ```

   (el `id` es el mismo UUID que aparece en Authentication → Users).

## Base de datos

El proyecto de Supabase ya incluye:

- Esquema completo (categorías, productos, tamaños, masas, salsas, toppings,
  ingredientes, recetas, pedidos, movimientos de inventario, perfiles).
- Row Level Security: el menú es de lectura pública, los pedidos se pueden
  crear como invitado (checkout sin cuenta) y todo lo administrativo
  (inventario, recetas, edición de menú) requiere una cuenta de staff/admin.
- Datos de ejemplo: ingredientes, categorías, pizzas preconfiguradas, la
  pizza personalizable "Arma tu Pizza" con sus 4 tamaños, masas, salsas y 10
  toppings — listos para probar la app de inmediato.

Si necesitas replicar el esquema en otro proyecto de Supabase, las
migraciones aplicadas (en orden) fueron: `initial_schema`,
`row_level_security`, `new_user_trigger`, `security_hardening`,
`fix_is_staff_grants`, `seed_data`, `enable_realtime_orders`.

## shadcn/ui

Los componentes en `src/components/ui/` siguen la convención de shadcn/ui
(código copiado al proyecto, no una dependencia de npm), estilo "new-york",
con los tokens de color mapeados a la paleta de marca en `globals.css`. Para
agregar un componente nuevo del catálogo oficial (con acceso a internet):

```bash
npx shadcn@latest add <componente>
```

## Personalización

- Nombre y tagline de la marca: `src/lib/config.ts`
- Costo de envío: también en `src/lib/config.ts`
- Cantidad de toppings gratis en "Arma tu Pizza": `FREE_TOPPINGS_LIMIT` en
  `src/lib/types.ts`
- Paleta de colores y tokens de shadcn/ui: `src/app/globals.css`

## Build de producción

```bash
npm run build   # genera el sitio estático en out/
npm run serve   # sirve out/ localmente para previsualizar el build
```

Como el proyecto usa `output: 'export'`, `next start` no aplica (no hay
servidor Next.js corriendo). `out/` es una carpeta 100% estática: además de
GitHub Pages, puedes subirla tal cual a Netlify, Cloudflare Pages o cualquier
hosting estático. Recuerda que `NEXT_PUBLIC_SUPABASE_URL` y
`NEXT_PUBLIC_SUPABASE_ANON_KEY` se inyectan en **build time**, no en
runtime — si cambias de proyecto de Supabase hay que volver a compilar.
