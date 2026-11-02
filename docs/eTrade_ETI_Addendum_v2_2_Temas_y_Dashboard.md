# eTrade Trading Intelligence (ETI) — Addendum v2.2

## Modelo de Temas (Opciones · Swing Trading · Scalping), fuentes iniciales y rediseño del Dashboard

**Versión:** 2.2 (addendum a `eTrade_ETI_Arquitectura_Final_v2.md` y `eTrade_ETI_Addendum_v2_1_Validacion_y_Acceso.md`)
**Fecha:** 31 de octubre de 2026
**Alcance de construcción inmediato:** solo el Tema **Opciones**. El modelo de datos y la UI nacen preparados para Swing y Scalping, pero esos Temas no se activan todavía.

| Sección anterior afectada | Efecto |
|---------------------------|--------|
| v2.0 §4, §8, §11 (Dashboard, modelo de datos) | El dashboard de v2.0 (pensado solo para Opciones) se **reemplaza** por el de §5. Se añaden tablas de Temas, Playbooks y mercado (§8). |
| v2.0 §9 (Validación) | La política de validación pasa a ser **por Tema** (§2, §7). |
| v2.0 §13 y v2.1 §7 (Sprints) | Se añaden ETI-S2B y ETI-S4B; se modifican S0, S1, S2, S4, S5/S6, S7, S8 (§9). |
| v2.0 §16 y v2.1 §10 (Prompt maestro) | Se añaden reglas 24–30 (§12). |

---

## 1. Terminología (propuesta para cerrar el término «Canal»)

«Canal» es ambiguo porque en YouTube significa el canal de cada creador. Para agrupar influencers por materia se propone este vocabulario (decisión D13):

| Término | Significado | Ejemplo |
|---------|-------------|---------|
| **Tema** (`topic`) | Agrupación por materia/estilo de trading. Tiene sus propias fuentes, taxonomía, Playbook, política de validación y mapa hacia el robot. | Opciones · Swing Trading · Scalping |
| **Fuente** (`source`) | Un creador/influencer y su canal de YouTube. Puede pertenecer a más de un Tema, con un `rol` distinto en cada uno. | Opción Sigma |
| **Playbook** | Libro de **reglas consolidadas** de todas las Fuentes de un Tema (ver §5.7). | Playbook de Opciones |
| **Horizonte** (`horizon`) | Duración típica de la operación, **independiente** del Tema de origen: `SCALP`, `INTRADAY`, `SWING`, `POSITION`. | Una regla de Scalping puede tener horizonte `SWING` |
| **Rol de la fuente en un Tema** | Qué aporta: `ENTRY_RULES`, `MARKET_CONTEXT`, `RISK_MGMT`, `EDUCATION`. | Imran Lakha → `MARKET_CONTEXT` |

---

## 2. Cada Tema tiene su propio juego de piezas (respuesta a «¿cada tema tendrá…?»)

Sí: cada Tema tiene su propio conjunto de piezas, sobre una base común.

| Pieza | Común a todos los Temas | Propia de cada Tema |
|-------|------------------------|---------------------|
| Pipeline de ingesta, filtro, extracción y revisión | ✔ | Taxonomía y umbrales de relevancia (§5.3 de v2.0) |
| Base de conocimiento, auth/roles, ledger, Knowledge Explorer | ✔ | — |
| Fuentes (influencers) | — | ✔ Lista, roles y prioridad |
| Playbook (reglas consolidadas) | — | ✔ |
| Datos para simular | — | ✔ (opciones, acciones intradía, barras diarias) |
| Motor de simulación y costes | Núcleo común | ✔ Adaptador por instrumento |
| Política de validación sellada | — | ✔ Umbrales y supuestos propios |
| Módulo consumidor en el robot | — | ✔ (ver §6) |
| Pestaña en el dashboard | — | ✔ |

### 2.1 Estado de activación

| Tema | Estado | Fuente(s) prevista(s) |
|------|--------|-----------------------|
| **Opciones** | **Activo** (MVP) | 5 fuentes (§4) |
| Scalping | Planificado, desactivado | Ross Cameron |
| Swing Trading | Planificado, desactivado | Jesús Navarrete |

Un Tema desactivado aparece en el dashboard en gris («próximamente»), sin datos ni procesamiento.

---

## 3. Horizonte y reclasificación entre Temas

- Cada estrategia/regla lleva `horizon_declared` (lo que dice el autor) y `horizon_effective` (calculado con el tiempo medio de tenencia en backtest/ledger). Umbrales orientativos, configurables: `SCALP` < 15 min · `INTRADAY` dentro de la sesión · `SWING` ≥ 1 noche · `POSITION` semanas o más.
- **Reclasificación** (p. ej. una parte del Scalping pasa a Swing): la acción la hace un `reviewer` desde la UI, con auditoría. La regla se mueve al Playbook del nuevo Tema **conservando el linaje de evidencia** (videos, timestamps).
- **Aviso de validez:** cambiar el horizonte cambia las temporalidades y los costes, así que la evidencia de backtest (E2) deja de ser aplicable y la regla vuelve a `STRUCTURED` para re-validarse bajo la política del nuevo Tema. El conocimiento se conserva; la validación no se hereda.

---

## 4. Fuentes iniciales del Tema Opciones

La lista proviene de un asistente externo (los enlaces llevan parámetros de ese origen). En esta revisión hice una verificación parcial, y el resto queda para S0/S1 contra la API de YouTube:

| # | Fuente | Idioma | Rol propuesto | Prioridad | Verificación |
|---|--------|--------|---------------|-----------|--------------|
| 1 | **Opción Sigma** (Luis Hernán Silva) | ES | `ENTRY_RULES` + `MARKET_CONTEXT` (SPX/0DTE, sesiones en vivo, GEX) | Muy alta | **Confirmado** (educador de opciones en español; varias fuentes públicas lo reseñan). Las cifras de suscriptores difieren entre fuentes, no se usan como dato. |
| 2 | **Gala Trades** | EN | `ENTRY_RULES` (2m/5m: breakouts, retests, rechazos, pivots) | Muy alta | **No pude confirmar canal ni handle.** La lista solo trae un enlace de búsqueda. Necesito el enlace exacto antes de registrarlo. |
| 3 | **Yoel Sardiñas** | ES | `ENTRY_RULES` + `EDUCATION` (análisis técnico, operaciones relatadas, psicología) | Alta | Pendiente: confirmar handle. |
| 4 | **Imran Lakha** (Options Insight) | EN | `MARKET_CONTEXT` (IV, flujo, GEX, gamma, 0DTE) | Alta | Pendiente: confirmar handle. |
| 5 | **John Carter** (Simpler Trading) | EN | `ENTRY_RULES` + `RISK_MGMT` (TTM Squeeze, momentum) | Alta | Pendiente: confirmar handle. |

**Observaciones de diseño**
- **Mezcla ES/EN (2/3):** el pipeline es bilingüe; la extracción conserva el idioma original y normaliza campos al vocabulario del DSL.
- **Roles distintos:** no todas las fuentes aportan reglas de entrada. Imran Lakha aporta sobre todo **contexto de régimen**; sus reglas alimentan la matriz de aplicabilidad (§6) más que las entradas.
- **Cobertura de texto desigual:** parte del contenido de estos creadores está en plataformas de suscripción o webinars de pago. La cobertura real por fuente (% de videos con texto accesible por las vías autorizadas de §6 de v2.0) se mide en S2/S3 y se muestra en la página de la Fuente.
- **Cierre de datos:** cada Fuente se registra con `channel_id` verificado por API, no por texto de búsqueda.

**Temas futuros (no se construyen aún):** Scalping → **Ross Cameron**; Swing → **Jesús Navarrete**. Antes de activarlos hay que confirmar el canal exacto de cada uno (con una sola búsqueda no logré identificar con certeza el canal de Jesús Navarrete).

---

## 5. Dashboard rediseñado (reemplaza el de v2.0 §11)

### 5.1 Navegación

```text
ETI
├── Mercado ahora            ← pantalla de inicio
│     ├── Estado y proyección (SPY, NDX, VIX, …)
│     └── Resumen de mercado (índices, amplitud, movers, mapa de calor)
├── Temas
│     ├── Opciones  (activo)
│     │     ├── Resumen
│     │     ├── Fuentes ─► [Fuente] resumen + todas sus reglas/estrategias
│     │     ├── Playbook (reglas consolidadas)
│     │     ├── Estrategias
│     │     ├── Validación
│     │     └── Experiencia (ledger)
│     ├── Scalping  (próximamente)
│     └── Swing Trading  (próximamente)
├── Knowledge Explorer
├── Review Queue
└── Operación (costes, jobs, salud) · Settings
```

### 5.2 Mercado ahora — Estado y proyección

**Panel de instrumentos** (lista configurable en Settings; por defecto): SPY/SPX, QQQ/NDX, DIA/DJI, IWM/RUT, **VIX**, rendimiento a 10 años, proxy de DXY (el ETF vía FMP ya activo en eTrade).

Cada tarjeta muestra:
- Mini-gráfico intradía de velas con volumen relativo (como en la referencia).
- **Estado actual** calculado en servidor: régimen (alcista / lateral / bajista), posición frente a EMA/SMA clave, extensión (sobrecompra/sobreventa), percentil de rango diario (ATR). Usa la **misma librería de indicadores de RADAR** para que el estado sea coherente con el robot.
- **Niveles clave** (máx./mín. previos, apertura, gap).
- **Proyección** (ver §5.4).

Para VIX: nivel, variación, percentil y estado de volatilidad.

### 5.3 Mercado ahora — Resumen de mercado (inspirado en la captura de Finviz)

Elementos a replicar, con datos **licenciados** (no se hace scraping de Finviz):

| Elemento de la referencia | Versión ETI |
|---------------------------|-------------|
| Tres gráficos de índices con variación del día | Panel de §5.2 |
| Barras de amplitud (avanzan/declinan, nuevos máximos/mínimos, % sobre SMA50 y SMA200) | Calculadas sobre el universo disponible. **V1 sobre los componentes del S&P 500** y rotulado así; amplitud de todo el mercado queda sujeta a datos. |
| Indicador de sesgo toro/oso | «Sesgo de sesión» derivado de la amplitud y del régimen de índices, con su fórmula visible |
| Tabla de mayores ganadores/perdedores con señal (nuevo máximo, sobrecompra, volumen inusual…) | `Top movers` con etiquetas calculadas |
| Mapa de calor del S&P 500 por sector | Componentes del S&P 500 por capitalización y variación del día |

Notas de datos (a cerrar en S0, D14): eTrade ya tiene claves de FMP, Finnhub y FRED, usa IBKR para acciones y exploró fuentes de top movers. Se reutilizan esos servicios; no se crea un proveedor paralelo. Los datos en tiempo real de índices (NDX, VIX) pueden requerir derechos de datos en IBKR; si no están, se usan proxys (QQQ para NDX) rotulados como tales. La actualización es **centralizada en servidor con caché** (cadencia configurable, por ejemplo 1–5 min en sesión), nunca una llamada a la API por usuario.

Nota: los top movers de la captura incluyen valores de baja capitalización con subidas de más del 100 % y volumen muy alto. Ese es el universo típico del futuro Tema Scalping; el panel de movers queda diseñado para alimentarlo cuando se active.

### 5.4 Proyección v1 (se perfeccionará con la inteligencia acumulada)

Para no mostrar certeza que no existe, la v1 es de **escenarios**, no una predicción numérica:

- **Tres escenarios** (alcista / lateral / bajista) por instrumento y horizonte, cada uno con **nivel de activación y de invalidación**, derivados del régimen, del estado del VIX y de los niveles clave.
- Entradas opcionales ya previstas en eTrade: el forecast de TimesFM (horizonte de 2 velas de 15 min, según su plan) como una señal más, claramente etiquetada.
- Más adelante se sumarán condiciones de los Playbooks (p. ej. squeeze, niveles de GEX) **cuando estén validadas**.
- Etiqueta visible: «Indicativa, no calibrada, no es una señal de operación». **Sin probabilidades numéricas hasta que estén calibradas.**

**Cómo se perfecciona:** cada proyección se guarda (`eti_market_projections`) y se evalúa al cierre (acierto direccional, rango alcanzado, niveles tocados) en un **scorecard** por instrumento y horizonte (`eti_projection_scores`). Solo cuando el scorecard muestre desempeño medible se promueven componentes y se permite mostrar probabilidades.

### 5.5 Página de Tema

Pestañas: **Resumen** (conteos, estado de validación, últimos hallazgos) · **Fuentes** · **Playbook** · **Estrategias** · **Validación** · **Experiencia**.

El resumen del Tema es un texto generado por IA **solo a partir de datos aprobados/estructurados** (no de transcripciones crudas), con citas a video y timestamp, versionado y con fecha de generación.

### 5.6 Página de Fuente (influencer)

- Cabecera: nombre, idioma, rol(es), Temas, `channel_id`, cobertura de texto, último sync.
- **Resumen de hallazgos** (IA, con citas, versionado).
- **Detalle de todas las reglas y estrategias encontradas:** tabla filtrable por estado de revisión, horizonte, régimen, nivel de evidencia, indicador; cada fila enlaza a video + timestamp.
- Indicadores de credibilidad de la Vía A (informativos, no aprueban nada).
- Videos procesados, descartados (con motivo) y pendientes.

### 5.7 Playbook consolidado (reglas de todas las Fuentes de un Tema)

**Construcción**
1. Agrupar reglas equivalentes entre Fuentes (hash del DSL normalizado + similitud de embeddings); un `reviewer` puede **fusionar o separar** grupos, con auditoría.
2. Por cada regla consolidada se muestra:
   - **Consenso:** cuántas Fuentes la respaldan y cuáles.
   - **Variantes de parámetros** observadas (rangos).
   - **Contradicciones** entre Fuentes (p. ej. una exige confirmación, otra no).
   - Régimen de aplicación y horizonte.
   - **Nivel de evidencia** (E0–E6) y **estado de validación**.
   - Uso en el robot: ninguno / shadow / informativo.
3. Estructura del Playbook de Opciones: Contexto y régimen · Selección de subyacente y contrato · Entrada CALL/PUT · Confirmación · Gestión y salida · Riesgo · Horarios y calendario.

**Advertencia visible en la UI:** **consenso no es validez.** Que varias Fuentes repitan una regla indica popularidad, no ventaja estadística. Consenso y validación son columnas separadas, y solo la validación (política sellada + evidencia forward) habilita el uso en el robot.

---

## 6. Mapa Tema → Horizonte → Módulo del robot

El robot necesita saber qué conocimiento aplica en cada horizonte. ETI no ejecuta; **declara aplicabilidad** y el módulo consumidor decide.

| Tema | Horizonte típico | Módulo consumidor en eTrade | Estado |
|------|------------------|-----------------------------|--------|
| Opciones | `INTRADAY` (0DTE/1DTE) | Módulo de Opciones (APEX Options Score + ADUANA de Opciones) | Definido |
| Scalping | `SCALP` | Módulo de acciones intradía | **Por definir en S0/D17** |
| Swing Trading | `SWING` | Módulo de acciones (swing) | **Por definir en S0/D17** |

- La consulta al servicio (`POST /api/eti/v1/context`) incluye `topic`, `horizon` y `consumer_module`.
- ETI publica una **matriz de aplicabilidad** régimen × regla del Playbook («en este régimen de mercado estas reglas validadas son compatibles / incompatibles / sin cobertura»), alimentada por el estado de Mercado ahora. En v1 es informativa.
- Se mantienen todas las barreras previas: sin órdenes, sin sustituir ADUANA, `execution_allowed = false`.

---

## 7. Qué cambia en cada Tema al activarlo (preparación)

El motor de simulación v2.0 está pensado para opciones. Para que Swing y Scalping no obliguen a reescribirlo, el diseño introduce **adaptadores por instrumento** (`OptionsAdapter` primero, `EquityAdapter` después) sobre un núcleo común (cartera, ejecución simulada, métricas, política sellada).

| Aspecto | Opciones (activo) | Scalping (Ross Cameron) | Swing (Jesús Navarrete) |
|---------|-------------------|-------------------------|-------------------------|
| Instrumento | Contratos de opciones | Acciones, típicamente de baja capitalización con momentum | Acciones/ETFs |
| Datos | Cadena histórica, bid/ask, IV/Greeks (D2) | Barras de 1 s a 1 min o ticks, premercado, float, halts | Barras diarias/4H ajustadas por splits y dividendos, calendario de resultados |
| Fricciones críticas | Spread de opciones, liquidez, tope USD 50 | Spreads amplios, slippage fuerte, llenados parciales, halts, disponibilidad para ventas en corto | Gaps, resultados, costes de mantener, rotación de capital |
| Riesgo de simulación | Fills optimistas | **Muy alto:** el slippage puede borrar la ventaja | Menor sensibilidad a fills; mayor al sobreajuste de parámetros |
| Política de validación | Sellada v1 (v2.0 §9.4) | Propia (muestra mínima y supuestos de fill más severos) | Propia (muestras en días/meses, ventanas walk-forward largas) |

Cada Tema define y sella su propia política antes de su primer backtest.

---

## 8. Modelo de datos (adiciones)

**Temas y Playbooks:** `eti_topics` (clave, nombre, estado `ACTIVE/PLANNED/DISABLED`), `eti_topic_sources` (N–N con `role`, `priority`), `eti_playbooks`, `eti_playbook_versions`, `eti_playbook_rules`, `eti_playbook_rule_members` (enlaza cada regla consolidada con las reglas originales de cada Fuente), `eti_playbook_conflicts`, `eti_summaries` (resúmenes de IA versionados por Fuente/Tema, con referencias de citas y fecha de generación).

**Mercado:** `eti_market_instruments` (watchlist configurable), `eti_market_snapshots`, `eti_market_breadth`, `eti_market_movers`, `eti_market_projections`, `eti_projection_scores`.

**Cambios en tablas existentes:** `topic_id` y `horizon_declared` / `horizon_effective` en estrategias, reglas, políticas de validación (`eti_validation_policies`), datasets, backtests y ledger; `instrument_type` en el motor y datasets.

Mismas reglas de v2.0 §8.3: RLS por rol (PLT-A1), versiones inmutables, auditoría. Los resúmenes de IA nunca sustituyen a los datos fuente y siempre enlazan a ellos.

---

## 9. Impacto en el plan de Sprints

| Sprint | Cambio |
|--------|--------|
| **ETI-S0** (modificado) | Añade: verificación de los `channel_id` de las 5 Fuentes (y petición del enlace exacto de Gala Trades); inventario de servicios de datos de mercado existentes (FMP, Finnhub, FRED, IBKR, plan de TimesFM) y derechos de datos para NDX/VIX; propuesta de módulo consumidor para Scalping/Swing. |
| **ETI-S1** (modificado) | Modelo de **Temas** desde el inicio: `eti_topics`, `eti_topic_sources`, `topic_id` y `horizon` en tablas; seed del Tema Opciones y sus Fuentes; Scalping/Swing creados como `PLANNED`. Sección «Temas» en Settings. |
| **ETI-S2** (modificado) | Registro y sync de Fuentes por Tema; cobertura de texto por Fuente. |
| **ETI-S2B — Mercado ahora v1** *(nuevo, 8–10 días, paralelo a S2–S4)* | §5.2 y §5.3 sin proyección: servicio de datos centralizado con caché, estado de régimen por instrumento (librería de RADAR), amplitud sobre S&P 500, movers, mapa de calor, panel de instrumentos configurable. **Aceptación:** una sola llamada a proveedor por ciclo para todos los usuarios; los rótulos de proxys y alcance de amplitud son visibles; el estado calculado coincide con el de la librería de indicadores existente; sin acceso sin autenticación (PLT-A1). |
| **ETI-S4** (modificado) | KB por Tema; páginas de Tema y de Fuente (§5.5–5.6); resúmenes de IA versionados con citas; **Playbook consolidado v1** (§5.7) con consenso, variantes y contradicciones. **Aceptación:** cada regla consolidada enlaza a las reglas originales y a sus videos/timestamps; consenso y validación aparecen separados; fusionar/separar queda auditado. |
| **ETI-S4B — Proyección v1 + Scorecard** *(nuevo, 5–7 días, tras S2B)* | §5.4. **Aceptación:** cada proyección se guarda con su `as_of`; el scorecard se calcula al cierre; ninguna probabilidad numérica se muestra sin calibración; la etiqueta «indicativa, no es señal» siempre visible. |
| **ETI-S5/S6** (modificado) | Diseño del motor con **adaptadores por instrumento**; solo `OptionsAdapter` se implementa. |
| **ETI-S7** (modificado) | Políticas de validación por Tema; reclasificación de horizonte reinicia la validación (§3). |
| **ETI-S8** (modificado) | `context` acepta `topic`, `horizon`, `consumer_module`; matriz de aplicabilidad (informativa). |
| **ETI-T2 / ETI-T3** — Activación de Scalping y Swing *(posteriores al MVP de Opciones)* | Cada uno sigue un **Kit de activación de Tema**: 1) Fuentes y roles verificados, 2) taxonomía y golden set, 3) datos y adaptador de instrumento, 4) política de validación propia y sellada, 5) módulo consumidor definido, 6) pestaña del dashboard, 7) revisión de legalidad/licencias de datos. No se inician hasta cerrar el Sprint S4 de Opciones y decidir D17. |

**Orden resultante:** `S0 → PLT-A1 → S1 → (S1B ∥ S2 ∥ S2B → S3 → S4 → S4B) → S5 → S6 → S6B → S7 → S8 → S9 → S10`, y después `T2` / `T3`.

**Estimación actualizada:** construcción del MVP de Opciones ≈ **20–24 semanas** (v2.1: 18–22), con parte en paralelo; más 4–8 semanas de paper trading. Es una estimación mía a revisar tras S0.

---

## 10. Decisiones nuevas

| ID | Decisión | Recomendación |
|----|----------|---------------|
| D13 | Vocabulario: **Tema / Fuente / Playbook / Horizonte** | Adoptarlo (resuelve la ambigüedad de «Canal»). |
| D14 | Datos del panel de mercado (índices, VIX, amplitud, movers, mapa de calor) | Reutilizar FMP/Finnhub/IBKR ya presentes; sin scraping de Finviz; proxys rotulados si falta licencia (NDX → QQQ). |
| D15 | Definición de la proyección v1 | Escenarios con niveles de activación/invalidación + scorecard; sin probabilidades hasta calibrar; TimesFM como entrada opcional. |
| D16 | Confirmar las 5 Fuentes de Opciones | Facilitar el enlace de Gala Trades y confirmar los handles; decidir si Imran Lakha entra solo como `MARKET_CONTEXT`. |
| D17 | Módulos consumidores y calendario de Scalping/Swing | Definirlos en S0; activar Swing y Scalping solo tras estabilizar Opciones en S4. |

---

## 11. Criterios de aceptación transversales (adición)

- Todo dato, regla y resumen pertenece a un Tema (`topic_id` no nulo).
- Un Tema `PLANNED` no ejecuta jobs ni consume cuota.
- Los resúmenes de IA citan video y timestamp; no se generan desde transcripciones crudas.
- El Playbook nunca presenta consenso como validación.
- La proyección de mercado siempre lleva etiqueta «indicativa» y su scorecard.
- Cambiar el horizonte de una regla vuelve a su estado `STRUCTURED` y exige re-validación.
- Los paneles de mercado usan una caché central y respetan los derechos de datos de cada proveedor.

---

## 12. Adenda al prompt maestro para Antigravity (reglas 24–30)

```text
24. ETI se organiza por TEMAS (Opciones, Swing Trading, Scalping). Todo registro (fuentes, estrategias, reglas, políticas, datasets, backtests, ledger) lleva topic_id. Solo el Tema Opciones se activa ahora; Swing y Scalping se crean como PLANNED y no ejecutan jobs.
25. Vocabulario: Tema (agrupación), Fuente (influencer y su canal de YouTube), Playbook (reglas consolidadas por Tema), Horizonte (SCALP/INTRADAY/SWING/POSITION, independiente del Tema). No uses «Canal» para agrupar influencers.
26. Registra las Fuentes con channel_id verificado por API. No registres una Fuente a partir de un enlace de búsqueda. Si falta información (p. ej. Gala Trades), pídela y espera.
27. El Playbook consolida reglas equivalentes entre Fuentes (hash del DSL + embeddings), con consenso, variantes, contradicciones, nivel de evidencia y estado de validación en columnas separadas. Consenso NO es validez.
28. El dashboard inicial es «Mercado ahora»: estado por instrumento (SPY/SPX, QQQ/NDX, DIA, IWM, VIX, rendimiento a 10 años, proxy de DXY) calculado con la librería de indicadores de RADAR, y resumen de mercado (índices, amplitud, movers, mapa de calor). Reutiliza FMP/Finnhub/IBKR existentes con caché central; no hagas scraping de Finviz; rotula los proxys y el alcance de la amplitud (S&P 500).
29. La proyección v1 es por escenarios con niveles de activación/invalidación, etiquetada «indicativa, no es señal», sin probabilidades numéricas hasta calibrar. Guarda cada proyección y evalúala en un scorecard.
30. El motor de simulación usa adaptadores por instrumento (OptionsAdapter ahora, EquityAdapter después). Cambiar el horizonte de una regla reinicia su validación. Los resúmenes de IA se generan solo desde datos aprobados/estructurados, con citas a video y timestamp.

ORDEN: S0 → PLT-A1 → S1 → (S1B ∥ S2 ∥ S2B → S3 → S4 → S4B) → S5 → S6 → S6B → S7 → S8 → S9 → S10; luego T2 (Scalping) y T3 (Swing).
S0 incluye además: verificación de channel_id de las 5 Fuentes, inventario de servicios de datos de mercado y derechos para NDX/VIX, y propuesta de módulo consumidor para Scalping/Swing.
```
