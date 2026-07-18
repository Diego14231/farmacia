# Plan de construcción — Tienda Online de Farmacia (Chile)

> Documento de especificación para que un equipo o un agente de IA pueda construir el sitio completo sin contexto adicional. Redactado a partir de: (a) las decisiones ya tomadas por el cliente, (b) el análisis real del archivo `inventario1.xlsx` (4.986 SKUs), y (c) investigación de la normativa ISP vigente sobre comercio electrónico de medicamentos en Chile. Las secciones marcadas **⚠️ PENDIENTE DE CONFIRMAR** son huecos de información real que hay que cerrar antes o durante el desarrollo — no se debe inventar esa información.

---

## 0. Decisiones ya tomadas (no volver a discutir)

| Decisión | Resultado |
|---|---|
| Modelo de venta | **E-commerce completo con despacho a domicilio** (carrito, pago online, receta cuando corresponda, logística de entrega) |
| Base de datos | **Totalmente separada** del CRM VentaPlay — proyecto Supabase propio, nuevo, solo para la farmacia. No se reutiliza el multi-tenant de `mrm-enrolapro` |
| Repositorio | **Repo nuevo y separado** (`farmacia-ecommerce`, placeholder hasta tener el nombre de fantasía definitivo), desplegado aparte (Vercel/Netlify) con dominio o subdominio propio |
| Relación con `mrm-enrolapro` | Solo se reutilizan **patrones de código y arquitectura** (estructura de carpetas, hooks, componentes shadcn/ui, estrategia de validación, patrones de Edge Functions de pago) — no hay import de tablas ni de código en runtime |
| Frontend | **Next.js (App Router)**, confirmado — ver 4.1 para el porqué (SEO de un storefront público) |
| Autorización ISP de comercio electrónico | **No gestionada todavía**, pero **esto no bloquea la construcción de la app**. Ver sección 2.4: se construye la app completa (incluyendo medicamentos y receta) contra un proyecto Supabase real desde el día 1, y el trámite ISP corre en paralelo. Lo único que el trámite bloquea es **publicar/activar la venta real de medicamentos al público** — no el desarrollo |

---

## 1. Resumen ejecutivo

Se va a construir un sitio de e-commerce para una farmacia chilena real (inventario de 4.986 productos ya provisto), con:
- Catálogo público con búsqueda y precios
- Carrito, checkout y pago online
- Flujo de receta médica (subida, validación por químico farmacéutico) para los productos que la requieran
- Despacho a domicilio (y opcionalmente retiro en tienda)
- Panel interno para el equipo de la farmacia (stock, pedidos, validación de recetas, reportes)

El mayor riesgo del proyecto **no es técnico, es regulatorio**: en Chile, vender medicamentos por internet requiere una autorización específica del ISP (Instituto de Salud Pública), separada de la resolución sanitaria de funcionamiento normal de la farmacia, y que **hoy no está tramitada**. Esto **no impide construir la app completa ahora**: se puede desarrollar y probar de punta a punta (catálogo, carrito, pagos, recetas, panel interno) contra un proyecto Supabase real, y recién al momento de salir a producción pública se decide si se lanza todo junto (cuando el trámite ISP esté aprobado) o por fases (ver 2.4). El papeleo y la construcción corren **en paralelo**, no en serie.

---

## 2. Marco regulatorio ISP — qué sabemos y qué falta confirmar

### 2.1 Lo que es públicamente conocido (fuente: ISP / MINSAL)

Chile modificó el "Reglamento de Farmacias, Droguerías, Almacenes Farmacéuticos, Botiquines y Depósitos Autorizados" (Decreto Supremo N°466) para regular el **comercio electrónico de medicamentos**, y existe una **Guía Técnica de Expendio de Medicamentos por Medios Electrónicos** (aprobada por Res. que cita RM 2271, 25-05-2022) publicada por el ISP. Puntos clave confirmados:

- La farmacia necesita pedir y obtener una **autorización específica del ISP** para poder vender medicamentos por medios electrónicos — es un trámite adicional a la resolución sanitaria de funcionamiento del local físico.
- Una vez obtenida, la **resolución de autorización de comercio electrónico debe estar visible y de fácil acceso en el sitio web** (típicamente en el footer o una página "Marco Regulatorio" / "Quiénes Somos").
- Debe existir un **Director Técnico (Químico Farmacéutico)** responsable, identificable en el sitio.
- El manejo de **recetas médicas** (simple, retenida, cheque) debe tener un flujo de validación farmacéutica antes del despacho, con **trazabilidad y guarda de al menos 6 meses**.
- La búsqueda de productos no puede **priorizar comercialmente** un producto sobre otro cuando se busca por principio activo, y se debe **mostrar alternativas bioequivalentes**.
- Debe informarse claramente: precio, fraccionamiento (presentación/unidad), condiciones de conservación (ej. cadena de frío), y **disponibilidad de stock en tiempo real** — no se puede vender algo que no hay.
- El sitio debe tener: página de reclamos, políticas de venta y devolución, medios de pago, e información de contacto.
- El despacho de productos que requieren cadena de frío debe garantizar temperatura y ventanas de entrega acotadas.
- Existe una distinción legal fuerte entre:
  - **Medicamentos** (regulados por esta normativa ISP) — requieren la autorización de e-commerce.
  - **Productos "parafarmacia"** (perfumería, cosméticos, productos naturales/suplementos sin registro ISP como medicamento, insumos) — **no están sujetos a esta autorización especial** y se pueden vender online como cualquier otro e-commerce (sujeto a ley general del consumidor y protección de datos).

### 2.2 ⚠️ PENDIENTE DE CONFIRMAR (obligatorio antes de ir a producción con venta de medicamentos)

No pude acceder al PDF oficial de la Guía Técnica completa en esta sesión (error de certificado SSL del sitio `ispch.gob.cl` al intentar descargarlo). **Antes de habilitar la venta de medicamentos**, alguien del equipo (idealmente el químico farmacéutico / Director Técnico) debe:

1. Descargar y leer el documento oficial vigente en `ispch.gob.cl/anamed/comercio-electronico-de-medicamentos/` (buscar "Guía Técnica Expendio de Medicamentos por Medios Electrónicos" e "instructivo para representantes legales de farmacias").
2. Iniciar el trámite de autorización de comercio electrónico de medicamentos ante el ISP para el establecimiento (dirección, resolución sanitaria vigente, etc.).
3. Confirmar la lista exacta de qué categorías de receta (simple / retenida / cheque, psicotrópicos y estupefacientes) **sí se pueden vender con despacho a domicilio** y cuáles quedan restringidas solo a validación presencial — este punto tiene implicancia legal directa y no debe decidirse por default técnico.
4. Confirmar requisitos específicos de rotulado, trazabilidad de lote/vencimiento y devoluciones para medicamentos (distintos a la devolución de un producto de perfumería).

**Regla de diseño derivada de esto:** el sistema debe modelar desde el día 1 un campo `condicion_venta` por producto (`venta_directa` / `receta_simple` / `receta_retenida` / `receta_cheque` / `no_vendible_online`), de modo que activar o restringir categorías completas sea un cambio de datos, no un cambio de código.

**Tarea concreta para la Directora Técnica / Química Farmacéutica (la hermana de Diego):** revisar el listado de productos y, para cada uno que sea medicamento, indicar:
1. **Si requiere receta o no** (`venta_directa` vs. `receta_simple` / `receta_retenida` / `receta_cheque`).
2. De paso, marcar cuáles del catálogo **ni siquiera son medicamentos** (perfumería, suplementos, insumos) — esto también hace falta porque el Excel actual no lo distingue (ver sección 3).

No necesita saber nada de tecnología para esto — puede ser una planilla simple (SKU + tipo de receta) que después se carga a la base de datos. Es trabajo 100% independiente de la construcción del sitio, así que puede hacerse en paralelo sin bloquear al equipo de desarrollo.

### 2.3 Construcción vs. lanzamiento — no son lo mismo

El trámite ISP condiciona **qué se puede vender públicamente**, no qué se puede **construir**. Por eso el plan separa dos cosas:

- **Construcción**: se levanta la app completa (catálogo con medicamentos, carrito, checkout con pago real en modo sandbox/pruebas, flujo de receta, panel interno) contra un proyecto Supabase real, en un dominio de staging (ej. `staging.farmacia.cl` o una URL de Vercel con protección por contraseña) que no es pública para el cliente final. Esto puede avanzar **ahora mismo**, sin esperar nada del ISP.
- **Lanzamiento**: es la decisión de negocio de qué queda visible/vendible en el dominio público real. Aquí sí aplica la restricción legal.

### 2.4 Opciones de lanzamiento una vez la app esté construida

| Opción | Qué se activa en el dominio público | Requiere autorización ISP e-commerce medicamentos |
|---|---|---|
| **A — Lanzamiento único y completo** | Todo el catálogo (medicamentos + parafarmacia) el mismo día, una vez que el trámite ISP esté aprobado | Sí, para ese día de lanzamiento |
| **B — Lanzamiento por fases** | Salir antes solo con parafarmacia (perfumería, naturales, cuidado personal) mientras el trámite ISP sigue en curso, y sumar medicamentos cuando se apruebe | No para la primera etapa, sí para sumar medicamentos después |

Ambas opciones usan **exactamente la misma app** — la diferencia es solo qué valor tiene `activo_online` por producto en el ambiente de producción el día del lanzamiento. Se puede decidir esto más adelante, cuando se sepa cómo va el trámite; no es necesario resolverlo ahora.

---

## 3. Análisis del inventario real (`inventario1.xlsx`)

Se analizó el archivo provisto. Hallazgos que condicionan el diseño de datos:

- **4.986 SKUs**, columnas: `Código, Producto, P. Costo, P. Venta, P. Mayoreo, Existencia, Inv. Mínimo, Inv. Máximo, Departamento`.
- **Códigos**: 4.383 filas (≈88%) tienen un código que parece EAN-13 (13 dígitos, código de barras estándar); ≈603 filas (≈12%) tienen códigos internos no estandarizados (nombres de laboratorio como `"FREMAVAL CENABAST"`, números cortos como `"30"`, `"222"`, códigos internos de 6-8 dígitos). No hay códigos duplicados, así que sirve como llave única, pero **el código no es homogéneo** — el modelo de datos debe tratarlo como texto libre (`sku_codigo`), no asumir siempre EAN-13 válido para escaneo de código de barras.
- **Precios y stock vienen como texto formateado**, no como números: `"$14,990"`, `"0.00"`, etc. **Esto no es un problema para el usuario ni requiere volver a escribir el Excel** — es un detalle técnico trivial que se resuelve con un script de una sola vez (quitar `$`, `.`, `,` y convertir a `decimal`) al momento de importar el catálogo a Supabase. El script se escribe como parte de la Etapa 1 del roadmap (sección 6) y no vuelve a tocarse manualmente después.
- **Categorización muy incompleta**: 66 valores distintos de `Departamento`, pero el 62% de las filas (3.091 de 4.986) están como `"- Sin Departamento -"`. Las categorías reales más pobladas son `PERFUMERIA` (801), `PRODUCTOS NATURALES` (184), y luego una larga cola de nombres de laboratorio (`Genérico`, `GENERICO/SEVENPHARMA`, `EUROFARMA`, `BAGO`, etc.) mezclados con categorías terapéuticas reales (`ANTIBIOTICOS`, `OFTALMICO Y OTICO`, `SALUD FEMENINA`, `HIPOGLICEMIANTES`, `ANTIGRIPALES`, `LAXANTE`). Esto **no sirve tal cual como taxonomía de navegación para el sitio** — hay que construir una categorización nueva orientada al cliente final (ej. "Medicamentos", "Cuidado personal", "Perfumería", "Bebé y mamá", "Vitaminas y suplementos", "Cuidado de la piel", etc.) y mapear cada producto a ella.
- **Estimación aproximada (heurística por nombre del producto, no oficial)**: ~21% de los productos (1.067) tienen en su nombre palabras típicas de forma farmacéutica (`MG`, `COMP`, `JARABE`, `CAPS`, `INYECTABLE`, `GOTAS`, etc.), lo que sugiere que son medicamentos. **Esto es solo una señal aproximada para dimensionar el trabajo, no un criterio válido para decidir qué requiere receta o autorización ISP** — la clasificación real de "es medicamento / requiere receta / tipo de receta" debe salir de:
  - El **registro sanitario** de cada producto (consultable en `registrosanitario.ispch.gob.cl` por nombre/registro ISP), y/o
  - Clasificación manual del **químico farmacéutico** de la farmacia.

### 3.1 Tarea de enriquecimiento de datos (bloqueante para activar la venta pública de medicamentos, no para construir la app)

Antes de vender medicamentos **al público**, cada SKU medicamento necesita datos que **no están en el Excel actual** (para construir y probar la app en staging no hace falta esperar esto, ver 2.3):
- `es_medicamento` (booleano)
- `registro_isp` (número de registro sanitario, si aplica)
- `condicion_venta` (`venta_directa` / `receta_simple` / `receta_retenida` / `receta_cheque`)
- `principio_activo` (para agrupar bioequivalentes)
- `requiere_cadena_frio` (booleano, para logística de despacho)
- `lote` / `fecha_vencimiento` (si se va a manejar trazabilidad por lote — recomendado para medicamentos)

Esto es trabajo humano/farmacéutico + posible cruce con la base pública del ISP, no algo que un desarrollador pueda completar por su cuenta. **Ver `scripts/clasificar_medicamentos.py` y `scripts/csv_a_excel_seguro.py`** — pipeline de emparejamiento contra el registro sanitario del ISP que reduce este trabajo a revisar/confirmar, no reemplaza la firma de la Química Farmacéutica (ver sección 9).

---

## 4. Arquitectura técnica propuesta

### 4.1 Stack

**Decisión confirmada:**

| Capa | Recomendación | Por qué |
|---|---|---|
| Frontend | **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui** | El CRM (`mrm-enrolapro`) usa Vite SPA, que funciona bien para un panel interno autenticado. Pero esto es una **tienda pública** que necesita SEO real (gente busca "farmacia [comuna] [medicamento] precio" en Google) — un SPA renderizado 100% en cliente indexa mal. Next.js permite SSR/ISR en las páginas de producto/categoría y mantiene el mismo lenguaje (TS) y librería de componentes (shadcn/ui) que el equipo ya conoce por el CRM. Es la única desviación deliberada del stack del CRM, y queda confirmada como decisión de este proyecto. |
| Backend / datos | **Supabase nuevo** (Postgres + Auth + Storage + Edge Functions), proyecto propio | Mismo proveedor que ya domina el equipo (Supabase), pero proyecto 100% independiente del de `mrm-enrolapro`, como se definió en la sección 0 |
| Autenticación clientes | Supabase Auth (email/password o magic link) | Simple, nativo |
| Autenticación panel interno (farmacia) | Supabase Auth + tabla de roles (`staff_roles`: admin, químico farmacéutico, bodega/despacho) | El panel interno no necesita el sistema de "custom auth" del CRM — es un proyecto nuevo, puede usar Supabase Auth estándar con RLS por rol |
| Pagos | Mercado Pago y/o Webpay/Transbank o TUU (Haulmer) | El CRM ya tiene Edge Functions de referencia para Mercado Pago (`crear-preferencia-mp`) y TUU (`crear-pago-productos-tuu`, `verify-tuu-payment-background`) — **se puede tomar esa arquitectura de Edge Function como plantilla de implementación**, pero hay que escribirla de cero en el nuevo proyecto (no se comparte código en runtime). Definir con el cliente qué pasarela usa la farmacia hoy para cobrar. |
| Notificaciones (confirmación de pedido, estado de receta) | Email transaccional (Resend) + opcionalmente WhatsApp Business API si la farmacia ya tiene un número | Consistente con el resto del ecosistema VentaPlay |
| Hosting | Vercel (si Next.js) | Despliegue simple, preview deployments por PR |
| Storage de archivos | Supabase Storage | Fotos de producto, PDFs/fotos de recetas subidas por el cliente (con RLS estricta — dato sensible de salud) |

### 4.2 Estructura de carpetas sugerida (inspirada en los patrones de `mrm-enrolapro`, no copiada literal)

```
farmacia-ecommerce/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (storefront)/         # rutas públicas: /, /productos, /categoria/[slug], /producto/[slug], /carrito, /checkout
│   │   ├── (cuenta)/             # rutas autenticadas del cliente: /mis-pedidos, /mis-recetas
│   │   └── (admin)/              # panel interno farmacia: /admin/pedidos, /admin/recetas, /admin/inventario
│   ├── components/
│   │   ├── storefront/           # ProductCard, CategoryNav, CartDrawer, ReceiptUploader...
│   │   └── admin/
│   ├── services/                 # capa de acceso a datos (equivalente a src/services de mrm-enrolapro)
│   │   ├── productos/
│   │   ├── pedidos/
│   │   ├── recetas/
│   │   └── pagos/
│   ├── hooks/                    # hooks TanStack Query por dominio, igual patrón que el CRM
│   ├── config/                   # config de validación de formularios, tablas admin (patrón EntityManagementConfig del CRM)
│   └── types/
├── supabase/
│   ├── migrations/
│   └── functions/                # Edge Functions: crear-pago, confirmar-pago-webhook, validar-receta, etc.
├── scripts/
│   ├── import-inventario.ts      # script de ETL: lee el Excel/CSV de la farmacia y puebla `productos`
│   ├── clasificar_medicamentos.py  # matching contra registro sanitario ISP (ver sección 9)
│   └── csv_a_excel_seguro.py       # conversor CSV -> xlsx sin dañar códigos de barra
└── docs/
    └── PLAN-FARMACIA-ONLINE.md    # este documento
```

### 4.3 Modelo de datos (borrador inicial)

```sql
-- Catálogo
categorias (id, nombre, slug, parent_id, orden)
productos (
  id, sku_codigo, nombre, descripcion, categoria_id,
  precio_costo, precio_venta, precio_mayorista,
  stock_actual, stock_minimo, stock_maximo,
  es_medicamento boolean default false,
  registro_isp text,                     -- nulo si no es medicamento
  condicion_venta text,                  -- valores oficiales ISP: 'directa' | 'receta_simple' | 'receta_retenida' | 'receta_cheque' | 'receta_retenida_control_existencia' | 'no_vendible_online'
  principio_activo text,                 -- para agrupar bioequivalentes
  requiere_cadena_frio boolean default false,
  activo_online boolean default false,   -- permite prender/apagar por fases (ver sección 2.3) sin tocar código
  imagen_url,
  created_at, updated_at
)
bioequivalentes (producto_id, bioequivalente_de_producto_id)  -- o agrupar por principio_activo

-- Clientes y direcciones
clientes (id, auth_user_id, nombre, rut, email, telefono, created_at)
direcciones (id, cliente_id, calle, numero, comuna, ciudad, referencia, es_default)

-- Recetas médicas
recetas (
  id, cliente_id, archivo_url, tipo ('simple'|'retenida'|'cheque'),
  estado ('pendiente'|'validada'|'rechazada'),
  validada_por_staff_id, validada_at, motivo_rechazo,
  created_at
)  -- guardar mínimo 6 meses (ver 2.1); RLS estricta, dato de salud sensible

-- Pedidos
pedidos (
  id, cliente_id, direccion_id, estado
    ('carrito'|'pendiente_pago'|'pagado'|'en_preparacion'|'despachado'|'entregado'|'cancelado'),
  requiere_receta boolean, receta_id,
  subtotal, costo_despacho, total,
  metodo_pago, referencia_pago_externo,
  created_at, updated_at
)
pedido_items (id, pedido_id, producto_id, cantidad, precio_unitario, lote, fecha_vencimiento)

-- Staff / panel interno
staff (id, auth_user_id, nombre, rol ('admin'|'quimico_farmaceutico'|'bodega'))

-- Compliance / contenido legal
resoluciones_sanitarias (id, tipo, numero, fecha, archivo_url, vigente boolean)  -- para mostrarlas en el footer/página "Marco Regulatorio"
reclamos (id, cliente_id, pedido_id, mensaje, estado, respuesta, created_at)
```

**Nota de diseño clave:** el campo `activo_online` (por producto) y `condicion_venta` son los que implementan las opciones de lanzamiento de la sección 2.4 — lanzar con Opción B es simplemente tener `activo_online = true` solo en categorías no-medicamento, y sumar medicamentos a medida que el trámite ISP y la clasificación de catálogo lo permitan, sin deploys de código.

### 4.4 Integración de pagos y despacho

- Definir con el cliente la pasarela de pago real que usará la farmacia (Mercado Pago, Transbank/Webpay, TUU/Haulmer — el ecosistema VentaPlay ya opera con TUU vía Haulmer para otros clientes, podría ser la opción más rápida si la farmacia ya tiene cuenta Haulmer).
- El despacho a domicilio necesita definir: ¿zona de cobertura?, ¿despacho propio o con courier externo (Chilexpress, Uber Direct, etc.)?, ¿existen productos que requieren cadena de frío en el catálogo real? (a confirmar con la química farmacéutica — ver 3.1, campo `requiere_cadena_frio`).

---

## 5. Requisitos de contenido/compliance que debe tener el sitio (checklist para el equipo de diseño/legal)

- [ ] Resolución sanitaria del local visible (footer o página dedicada)
- [ ] Resolución ISP de comercio electrónico de medicamentos visible **una vez obtenida** (bloqueante para vender medicamentos públicamente, no para la parafarmacia — ver 2.4)
- [ ] Identificación de la Directora Técnica / Química Farmacéutica responsable
- [ ] Página de políticas de venta, cambios y devoluciones
- [ ] Página/canal de reclamos (con seguimiento del estado del reclamo)
- [ ] Política de privacidad y tratamiento de datos personales — ojo con la nueva Ley 21.719 de Protección de Datos Personales de Chile (vigente/entrando en régimen en 2026), especialmente porque las recetas médicas son **datos sensibles de salud**
- [ ] Medios de pago informados
- [ ] Stock en tiempo real (no ofrecer para la venta lo que no hay)
- [ ] Buscador que no priorice comercialmente un producto sobre otro al buscar por principio activo, y que muestre alternativas bioequivalentes
- [ ] Trazabilidad y guarda de recetas médicas (mínimo 6 meses, según lo confirmado en 2.2)
- [ ] "Infografía de medicamentos" (obligatoria por el Título VI bis, ver 8.4) — usar el material ya elaborado por MINSAL/ISP (`minsal.cl/medicamentos_uso_racional/`)

---

## 6. Roadmap sugerido

La app se construye **completa** (catálogo con medicamentos, carrito, checkout, receta, panel interno) en un ambiente de staging/desarrollo, mientras el trámite ISP corre en paralelo. El lanzamiento público (sección 2.4) es una decisión posterior e independiente del ritmo de desarrollo.

| Etapa | Contenido | Depende de |
|---|---|---|
| **0. Setup** | Crear repo nuevo, proyecto Supabase nuevo, scaffolding Next.js + shadcn/ui, CI/CD a Vercel (con protección por contraseña mientras no sea público) | — |
| **1. ETL de catálogo** | Script de limpieza del Excel (parseo de precios/stock, normalización de `Código`), carga a `productos`, categorización nueva orientada a cliente (reemplaza los 66 "Departamento" crudos) | Excel ya disponible ✅ |
| **2. Storefront completo** | Catálogo público + carrito + checkout (pago en modo pruebas/sandbox) + página de producto, para **todo** el catálogo (medicamentos y parafarmacia) | Etapa 1 |
| **3. Flujo de receta médica** | Subida de receta, cola de validación farmacéutica, estados de pedido asociados | Etapa 2 |
| **4. Panel interno** | Login staff, gestión de pedidos, gestión de stock, validación de recetas, reportes básicos | Etapa 0 |
| **5. Enriquecimiento de catálogo (en paralelo a 1-4, no bloquea desarrollo)** | La Química Farmacéutica clasifica `condicion_venta` / `es_medicamento` por SKU (ver 2.2) | Química Farmacéutica |
| **6. Trámite ISP (en paralelo a 1-4, no bloquea desarrollo)** | Gestionar la autorización de comercio electrónico de medicamentos ante el ISP para el establecimiento | Farmacia / representante legal |
| **7. Lanzamiento** | Pasar pagos a modo real, sacar la protección por contraseña, y decidir Opción A o B de la sección 2.4 según cómo vaya el trámite ISP en ese momento | Etapas 1-6 |

---

## 7. Información que falta y quién debe darla (no inventar)

| Dato | Quién lo tiene | Bloquea |
|---|---|---|
| Nombre de fantasía, dirección(es)/sucursales, dominio deseado | Cliente / dueño de la farmacia | Branding, setup de dominio |
| Resolución sanitaria vigente del local (número, fecha) | Farmacia | Compliance / footer |
| Contacto de la Química Farmacéutica / Directora Técnica | Farmacia | Compliance, clasificación de receta |
| Estado real y avance del trámite ISP de e-commerce | Farmacia (iniciar trámite, ver 2.2) | Venta pública de medicamentos (no bloquea desarrollo) |
| Clasificación `condicion_venta` / `registro_isp` por medicamento | Química Farmacéutica (posiblemente cruzando con `registrosanitario.ispch.gob.cl`) | Activar medicamentos en el sitio |
| Pasarela de pago a usar | Cliente | Etapa de checkout |
| Zona y método de despacho (propio / courier) | Cliente | Logística de despacho |
| ¿El listado de "Sin Departamento" (3.091 SKUs) incluye medicamentos mezclados con no-medicamentos? | Debe revisarlo la Química Farmacéutica o alguien de la farmacia con conocimiento del catálogo | Categorización y qué se puede lanzar antes de tener el trámite ISP aprobado (ver 2.4) |

---

## 8. Marco regulatorio verificado (Instructivo oficial del ISP + portal en vivo)

### 8.1 Base legal y trámite exacto

- Normativa: DFL N°725 (Código Sanitario), Decreto Supremo N°466/1984, modificado por **Decreto N°58/2020** del Minsal — el trámite habilita lo descrito en el **Título VI BIS "Del expendio de medicamentos por medios electrónicos"**.
- Solo puede solicitarlo una **farmacia o almacén farmacéutico ya autorizado** (resolución sanitaria de funcionamiento vigente) — no es un trámite para un negocio nuevo sin autorización sanitaria de local físico.
- Trámite/prestación ISP **código 4180008**, valor verificado en `ispch.gob.cl/prestacion/4180008/`: **$542.692 + IVA** (ese valor cambia en el tiempo, verificar antes de pagar).
- Se postula con el **"Formulario 5 — Expendio de medicamentos por medios electrónicos"** (descargable desde la misma página de la prestación), completando el campo correspondiente e ingresándolo formalmente en la Oficina de Gestión Documental del ISP (o al correo `ispprestaciones@ispch.cl` con copia a `autorizacionestablecimientos@ispch.cl` si es en regiones).

### 8.2 Documentación que hay que adjuntar (checklist para la farmacia, no para desarrollo)

- Resolución de autorización de instalación y funcionamiento del establecimiento (ya vigente).
- **Declaraciones firmadas por la Directora Técnica y la Directora Técnica Complementaria** que asumen la responsabilidad del expendio electrónico, + sus certificados de título profesional y de registro de prestadores individuales de salud de la Superintendencia de Salud.
- Comprobante de que el **dominio del sitio** está a nombre del dueño del establecimiento (o contrato/convenio de uso si es de un tercero).
- Contrato o convenio del **servicio de entrega/despacho** de medicamentos (propio o de terceros).
- **Facturas de compra vigentes** que acrediten el "petitorio mínimo" (stock mínimo disponible) del establecimiento.
- **Procedimientos/instructivos escritos** (documentos de texto, no código) que la farmacia debe redactar y tener listos: procedimiento de expendio electrónico, procedimiento de despacho, manejo de productos devueltos, limpieza/control de plagas/control de temperatura y humedad, manejo de quejas y reclamos.
- Documentación que respalde el contenido del sitio web según la **"Pauta de Chequeo"** oficial (anexo del instructivo, ver Fuentes).

### 8.3 El sitio debe existir ANTES/DURANTE de aplicar, no solo después

Una comisión técnica del ISP **evalúa el sitio electrónico** como parte de la solicitud (puede pedir reunión técnica). Construir primero es el orden correcto, no un atajo.

### 8.4 Hallazgos que cambian el diseño

1. **Toda venta por el sitio debe ser "visada o autorizada" por la química farmacéutica del establecimiento** — no solo las que llevan receta. Confirmar con ella/asesor legal si es revisión por pedido o responsabilidad general del proceso, antes de fijar la UX del checkout.
2. La venta por redes sociales, WhatsApp o marketplaces **NO cuenta como comercio electrónico autorizado** para medicamentos.
3. El sitio debe incluir una **"infografía de medicamentos"** (material MINSAL/ISP, `minsal.cl/medicamentos_uso_racional/`).

### 8.5 Los 5 valores oficiales de "Condición de Venta"

Verificado en vivo en `registrosanitario.ispch.gob.cl`:
- Directa
- Receta Simple
- Receta Retenida
- Receta Retenida con Control de Existencia
- Receta Cheque

---

## 9. Clasificación del catálogo contra el registro sanitario ISP

Una IA no debe simular ser la química farmacéutica ni firmar la clasificación legal — el instructivo del ISP exige que sea la Directora Técnica real, con título y registro en la Superintendencia de Salud, quien asuma esa responsabilidad. Lo que sí se construyó: un **script de emparejamiento** (`scripts/clasificar_medicamentos.py`) contra el registro sanitario público del ISP, que:

1. Toma cada producto del inventario (mismas columnas originales).
2. Busca el nombre limpio (sin dosis/presentación) contra `registrosanitario.ispch.gob.cl`.
3. Si hay un match confiable → agrega `Es Medicamento`, `Requiere Receta` (con el tipo exacto), y `Detalle` (registro ISP, principio activo, laboratorio).
4. Si no hay match → sugiere que no es medicamento.
5. Si queda ambiguo o el nombre "suena a medicamento" pero no aparece registrado → `Revisar Manual = SI`.

El resultado es el mismo Excel de la farmacia + 4 columnas nuevas al final — la Química Farmacéutica revisa y confirma, especialmente las filas marcadas `Revisar Manual = SI`; su revisión es la que cumple el requisito legal, no el script.

Ver `scripts/csv_a_excel_seguro.py` para convertir el CSV de salida a `.xlsx` sin que Excel dañe los códigos de barra largos (problema conocido de Excel con números largos en CSV).

---

## Fuentes consultadas (normativa ISP)

- [Instituto de Salud Pública — Comercio Electrónico de Medicamentos](https://www.ispch.gob.cl/anamed/comercio-electronico-de-medicamentos/)
- [ISP aplica el nuevo reglamento para el comercio electrónico de medicamentos (MINSAL)](https://www.minsal.cl/instituto-de-salud-publica-aplica-el-nuevo-reglamento-para-el-comercio-electronico-de-medicamentos/)
- [Retos y reglamentos del ISP para el funcionamiento de farmacias online — PropulsoW](https://www.propulsow.com/2024/05/16/retos-y-reglamentos-del-isp-para-el-funcionamiento-de-farmacias-online/)
- Guía Técnica de Expendio de Medicamentos por Medios Electrónicos (RM 2271, 25-05-2022) — debe leerse el documento oficial completo antes de habilitar la venta pública de medicamentos.
- Instructivo oficial ISP "Instrucciones para acceder a la autorización de expendio de medicamentos por medios electrónicos" (el mismo publicado en `ispch.gob.cl/prestacion/4180008/`)
- Portal `registrosanitario.ispch.gob.cl` (Consulta de Productos Registrados) — probado en vivo, confirma los 5 valores oficiales de Condición de Venta
