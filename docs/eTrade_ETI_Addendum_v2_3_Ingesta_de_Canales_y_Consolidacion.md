# eTrade Trading Intelligence (ETI) — Addendum v2.3

## Panel de ingesta de canales, extracción masiva y consolidación en reglas para el robot

**Versión:** 2.3 (addendum a v2.0, v2.1 y v2.2)
**Fecha:** 1 de noviembre de 2026
**Caso de referencia:** `https://www.youtube.com/@OPCIONSIGMA/videos` (722 videos según el usuario)
**Alcance:** el flujo central de ETI — *de la URL de un canal a reglas utilizables por el robot* — para los Temas Opciones (ahora), Swing y Scalping (después, con el mismo mecanismo).

| Sección anterior afectada | Efecto |
|---------------------------|--------|
| v2.0 §5 (Ingesta), §6 (Acceso a contenido), §7 (Extractor) | Se detallan y amplían con el **panel de ingesta** y el flujo de backfill (§2–§4). |
| v2.2 §4 (Fuentes iniciales) | Las Fuentes se registran **desde el panel por URL**, no a mano (§2). Resuelve el caso de Gala Trades. |
| v2.0 §9 y v2.2 §5.7 (Playbook) | Se define la cadena completa extracción → consolidación → **Rule Pack** (§6). |
| v2.0/v2.1/v2.2 §Sprints | Se modifican S2, S3, S4 y se añade ETI-S4C (§8). |
| Prompt maestro | Reglas 31–38 (§11). |

---

## 1. El flujo completo en una página

```text
URL del canal ─► [1 Resolver y previsualizar] ─► [2 Alcance + estimación de coste] ─► confirmar
                                                                                         │
                 ┌───────────────────────────────────────────────────────────────────────┘
                 ▼
 [3 Descubrimiento de los 722 videos (metadatos)] ─► [4 Filtro de relevancia + tipo de contenido]
                 ▼
 [5 Obtención de texto (vías autorizadas)] ─► [6 Extracción por tipo de contenido y Tema]
                 ▼
 [7 Revisión humana a escala] ─► [8 Consolidación por Fuente] ─► [9 Consolidación entre Fuentes = Playbook]
                 ▼
 [10 DSL + validación (v2.0 §9, v2.1)] ─► [11 RULE PACK versionado] ─► ETI Decision Service ─► robot (shadow/informativo)
```

Cada etapa tiene estado visible, es reanudable e idempotente, y puede pausarse. Las etapas 1–4 son totalmente automáticas con la API oficial de YouTube. **La etapa 5 es el cuello de botella real** y se trata con franqueza en §3.

---

## 2. Panel «Agregar Fuente» (alta por URL)

### 2.1 Entrada y resolución

Un campo único acepta cualquiera de estos formatos: `youtube.com/@handle`, `/channel/UC…`, `/c/…`, `/user/…`, la URL de un video o de una lista de reproducción (se resuelve al canal dueño), o el **nombre del canal** (búsqueda con candidatos para que el usuario elija).

- El sistema resuelve el `channel_id` definitivo por la API oficial y **nunca registra una Fuente sin `channel_id` verificado**.
- La búsqueda por nombre resuelve casos como Gala Trades: el panel lista candidatos (nombre, handle, miniatura, nº de videos, fecha del último video) y el usuario confirma. No hace falta que el usuario tenga la URL exacta.

### 2.2 Tarjeta de previsualización (antes de procesar nada)

Nombre, handle, `channel_id`, descripción, país/idioma detectado, fecha del primer y último video, **nº de videos y horas totales**, distribución por duración y año, % estimado de directos largos, enlaces externos de la descripción. Alertas: canal duplicado, canal ya registrado en otro Tema, conteo distinto entre la pestaña `/videos` y la lista de subidas (Shorts y directos pueden alterar la cifra; el sistema reporta ambas).

### 2.3 Configuración de la Fuente

| Campo | Opciones |
|-------|----------|
| Tema(s) | Opciones · Swing · Scalping (los Temas `PLANNED` aparecen deshabilitados hasta activarse) |
| Rol en el Tema | `ENTRY_RULES`, `MARKET_CONTEXT`, `RISK_MGMT`, `EDUCATION` |
| Prioridad | Muy alta / Alta / Normal |
| Alcance del backfill | Todos · últimos N videos · rango de fechas · listas de reproducción concretas |
| Exclusiones | Shorts, videos menores de X minutos, directos mayores de Y horas (configurable) |
| **Ventana de vigencia** | Antigüedad máxima del contenido a procesar (el mercado de opciones intradía cambió de forma material en pocos años; el contenido antiguo puede no aplicar). Default propuesto: últimos 3 años, editable. |
| Vía de texto | Según §3 (por Fuente) |
| Tope de presupuesto | USD máximo para esta Fuente (corte duro) |

### 2.4 Estimación previa y «dry run»

Antes de lanzar, el panel muestra una **estimación** (no un compromiso): videos que entrarán en cada etapa, tokens y coste esperados, tiempo aproximado y consumo de cuota de API. Se calcula con fórmula visible y se contrasta con el consumo real tras el primer lote. El usuario confirma o ajusta el alcance. Ejemplo de la lógica, con supuestos **ilustrativos** (la medición real sale del Spike C en S0): si de 722 videos un tercio pasara al procesamiento en profundidad (~240) y cada uno aportara del orden de 10–15 mil tokens de entrada por pasada, la pasada de extracción rondaría 2,4–3,6 millones de tokens, y más si hay directos de varias horas.

### 2.5 Resolución de cuota de YouTube

Descubrir 722 videos es barato en cuota: según la documentación vigente (a verificar en S0), la lista de subidas se pagina de 50 en 50 y la ficha de cada video se pide en lotes de 50, del orden de 30–35 unidades frente a una cuota diaria por defecto de 10.000. La búsqueda por nombre consume bastante más por llamada, por eso se usa solo en el alta.

---

## 3. Obtención de texto: la etapa que decide el alcance

El panel recorre y cataloga los 722 videos sin problema con metadatos. **Extraer estrategias exige el texto de lo que se dice en el video**, y para videos de terceros no existe una vía oficial, gratuita y automática asegurada (v2.0 §6; hasta donde sé, las subtitulaciones por API oficial requieren autorización del propietario y las herramientas no oficiales dependen de endpoints no documentados y pueden contravenir los términos de servicio; S0 verifica los términos vigentes). Por eso el diseño **desacopla** la ingesta del origen del texto:

### 3.1 Interfaz `TranscriptProvider` (intercambiable)

Un contrato único (`get_text(video_id) → texto con timestamps + idioma + calidad + origen + derechos`). Cualquier vía lícita se enchufa sin rediseñar nada:

| Proveedor | Estado |
|-----------|--------|
| `UserUploadProvider` (carga masiva) | **Se construye** |
| `CreatorAuthorizedProvider` (autorización del creador) | Se construye si algún creador la concede |
| `LicensedProvider` (servicio de transcripciones con licencia) | Esqueleto; se activa solo tras revisión de términos y coste (D18) |
| Cualquier método que evada controles de acceso | **No se construye** |

### 3.2 Carga masiva de textos (la vía que funciona desde el día uno)

- Zona de arrastre para múltiples archivos `.srt`, `.vtt`, `.txt`, `.json`, o pegado directo.
- **Emparejamiento automático** con el video por ID en el nombre del archivo, URL dentro del archivo o título aproximado, con vista de confirmación para los dudosos.
- Validación de formato, idioma y cobertura (¿cubre toda la duración?), y marca `USER_PROVIDED`.

### 3.3 Cola priorizada de «texto pendiente»

Como el texto puede ir llegando por tandas, el sistema **ordena los videos por valor esperado** (score de relevancia, tipo de contenido, vigencia, riqueza en reglas explícitas según capítulos/descripción) y muestra al usuario los **N que más conviene aportar primero** (p. ej. los 50 con mayor score). Así, aun sin automatización total, el usuario alimenta primero lo que más rinde y el sistema avanza de inmediato con ello.

### 3.4 Plan B explícito y honesto

Con solo metadatos, ETI puede construir un **índice de qué video trata qué** (títulos, descripciones, capítulos) y priorizar, pero **no puede extraer reglas**. Si ninguna vía automática resulta viable (D18), ETI opera como *curador asistido*: descubre y prioriza los 722, y el usuario aporta el texto de los más relevantes. El resto del sistema (extracción, consolidación, validación) funciona igual.

### 3.5 Calidad del texto

- **Glosario de dominio** (SPX, SPY, 0DTE, GEX, gamma, delta, strike, spread, VWAP, nombres de tickers…) para normalizar errores típicos de transcripción automática (especialmente en jerga financiera en español e inglés).
- Cada tramo lleva una **confianza de texto**; las extracciones sobre tramos de baja calidad bajan su confianza y se marcan.

---

## 4. Procesamiento masivo (backfill) de una Fuente

### 4.1 Estados por video

`DISCOVERED → CLASSIFIED → (DISCARDED_IRRELEVANT | DISCARDED_OUT_OF_WINDOW | AWAITING_TEXT) → TEXT_READY → EXTRACTED → IN_REVIEW → REVIEWED`. Cada estado guarda el motivo y la fecha.

### 4.2 Orden de procesamiento

Por **relevancia descendente** con desempate por recencia (no cronológico a ciegas), dentro de la ventana de vigencia. Se puede forzar «solo los N más relevantes primero» para ver resultados útiles pronto.

### 4.3 Clasificación por tipo de contenido (nuevo)

Además de relevante/no relevante, cada video se etiqueta: `TUTORIAL`, `LIVE_SESSION`, `RECAP`, `MARKET_ANALYSIS`, `INTERVIEW`, `PROMO`. Cada tipo usa una **plantilla de extracción distinta**: un directo de varias horas se procesa por tramos para extraer operaciones relatadas con timestamps; un tutorial se procesa para extraer reglas explícitas; un recap, para operaciones declaradas (Vía A). `PROMO` y entrevistas sin reglas se descartan con motivo.

### 4.4 Paquete de esquema por Tema (nuevo)

Cada Tema tiene su **Schema Pack**: esquema de extracción, extensión del vocabulario DSL, prompts y golden set propios.

| Tema | Campos que añade el esquema |
|------|-----------------------------|
| Opciones | Selección de contrato (DTE, delta/moneyness, estructura), horario, gestión del trade, régimen |
| Scalping | Criterios de escáner (gap %, float, volumen relativo, rango de precio), patrón de entrada (p. ej. micro pullback, bull flag), disparador, stop, relación riesgo/beneficio, horario |
| Swing | Temporalidad, criterio de tendencia, stop (p. ej. en ATR), objetivos, dimensionamiento, tiempo de tenencia, eventos |

Añadir un Tema nuevo = añadir un Schema Pack, sin tocar el pipeline.

### 4.5 Control de coste y progreso

- Embudo en vivo por Fuente: `722 descubiertos → n relevantes → n con texto → n extraídos → n revisados → n aprobados → n consolidados`.
- Pausar/reanudar/cancelar; reintentos con backoff; idempotencia por video y versión de extracción.
- Corte duro al alcanzar el tope de presupuesto; avisos al 50/80 %.
- Tras cada lote, comparar coste real vs estimación y recalcular lo que falta.

### 4.6 Sincronización continua y reprocesos

Tras el backfill, sync periódico incremental de videos nuevos. Si cambia el prompt o el modelo, el reproceso es una **acción explícita**: se crea una versión nueva de extracción (la anterior se conserva) y se compara contra el golden set antes de activarla. Videos eliminados o privados se marcan, no se borran.

---

## 5. Revisión humana a escala

722 videos pueden generar miles de candidatos; revisar uno a uno no es viable. Herramientas obligatorias:

- **Agrupación automática** de candidatos similares en clústeres (hash del DSL + embeddings) para decidir por grupo.
- **Fusión automática solo para duplicados exactos** (mismo DSL normalizado); todo lo demás lo decide un humano.
- **Triaje:** orden por confianza de extracción, novedad y nivel de evidencia; filtros por tipo de afirmación (`EXPLICIT_RULE` vs `INFERRED_RULE`).
- **Aprobación por lote** de elementos de alta confianza, con **muestreo de auditoría** obligatorio (un porcentaje configurable de lo aprobado en lote se revisa individualmente; si la tasa de error supera un umbral, se bloquea el lote).
- **Presupuesto de revisión:** tope de elementos/día configurable; la cola se ordena para que lo revisado primero sea lo más valioso.
- Atajos de teclado, vista lado a lado (candidato ↔ video en el timestamp) y auditoría de cada decisión.

---

## 6. De lo extraído a reglas para el robot

### 6.1 Cadena de consolidación

1. **Candidatos por video** (`eti_strategy_candidates`), con evidencia y timestamp.
2. **Consolidación por Fuente:** unir lo que un mismo autor repite en varios videos y registrar su **evolución en el tiempo** (si cambió una regla, ambas versiones quedan con fecha; la vigente pesa más). Detectar contradicciones internas.
3. **Consolidación entre Fuentes (Playbook del Tema, v2.2 §5.7):** reglas equivalentes agrupadas con consenso, variantes y contradicciones. Consenso ≠ validez.
4. **Normalización a DSL** (v2.0 §9.1): lo expresable pasa a regla ejecutable; lo discrecional queda como conocimiento (`NOT_TESTABLE`).
5. **Validación** (v2.0 §9 + v2.1): Vía B (backtest), Vías A y C como evidencia complementaria, política sellada del Tema.
6. **Rule Pack:** solo lo que supera el criterio entra.

### 6.2 Rule Pack (el artefacto que consume el robot)

Un paquete **versionado e inmutable** por Tema y horizonte, con: lista de reglas en DSL, parámetros, régimen de aplicabilidad, nivel de evidencia (E-level), versión de política de validación, fuentes de origen y fecha de caducidad/revisión. Es lo único que el `EtiDecisionService` expone al robot, nunca candidatos ni reglas sin validar.

- Un Rule Pack nuevo se publica solo con aprobación explícita del `owner` y pasa por shadow → informativo (v2.0 §10.4).
- Cada Rule Pack es comparable con el anterior (qué reglas entraron, salieron o cambiaron y por qué).
- Estados: `DRAFT → SHADOW → INFORMATIVE → (WEIGHTED, solo con decisión explícita) → SUPERSEDED/SUSPENDED`.

### 6.3 Qué significa «apta para el robot»

Criterio mínimo (se confirma en D22): regla expresada en DSL, con **E2 superado** en backtest bajo la política sellada del Tema y **evidencia forward** (E3 y/o E4/E5). Nada entra por consenso de influencers ni por una buena historia en un video.

---

## 7. Modelo de datos (adiciones)

`eti_source_resolutions` (URL original, tipo, `channel_id`, candidatos), `eti_ingestion_runs` (backfill/sync, alcance, estado, presupuesto), `eti_ingestion_scopes`, `eti_ingestion_estimates` (estimado vs real), `eti_transcript_uploads` (archivo, formato, emparejamiento, confirmación), `eti_text_provenance` (origen del texto, derechos, calidad; sin texto completo persistente salvo decisión explícita sobre retención), `eti_content_types`, `eti_prompt_profiles` (por tipo de contenido × Tema × versión), `eti_schema_packs`, `eti_glossary_terms`, `eti_consolidation_clusters`, `eti_cluster_members`, `eti_review_batches` (aprobaciones por lote + muestras de auditoría), `eti_rule_packs`, `eti_rule_pack_versions`, `eti_rule_pack_items`, `eti_reprocess_requests`.

**Retención:** se mantiene la regla de v2.0 §6 (sin transcripciones completas por defecto; paráfrasis, estructura, timestamps). Las cargas del usuario son efímeras salvo que él decida lo contrario; se conserva hash y referencia.

---

## 8. Impacto en el plan de Sprints

| Sprint | Cambio |
|--------|--------|
| **ETI-S0** (modificado) | Añade: verificación de cuota y límites reales de la API con el canal de Opción Sigma; medición de coste por video con una muestra (Spike C ampliado a 10 videos de tipos distintos: tutorial, directo, recap); decisión D18 sobre la vía de texto. |
| **ETI-S2** (modificado y ampliado, +4–5 días) | **Panel «Agregar Fuente»** completo (§2): resolución por URL/nombre, previsualización, alcance, estimación, dry run; **backfill** de metadatos de los 722 videos con embudo en vivo, pausa/reanudación y tope de presupuesto; clasificación por relevancia y tipo de contenido; ventana de vigencia. **Aceptación:** registrar `@OPCIONSIGMA` por URL y por nombre; los videos descubiertos coinciden con la lista de subidas y el conteo se explica si difiere de 722; segunda corrida idempotente; pausa/reanudación sin duplicados; estimación vs real mostradas tras el primer lote. |
| **ETI-S3** (modificado y ampliado, +4–5 días) | `TranscriptProvider` con `UserUploadProvider` (carga masiva y emparejamiento), cola priorizada de texto pendiente, glosario de dominio, plantillas de extracción por tipo de contenido y Schema Pack de Opciones. **Aceptación (corte vertical):** desde la URL del canal a **≥ 30 videos** con texto aportado, extraídos y listos para revisión, con métricas de calidad frente al golden set. |
| **ETI-S4** (modificado y ampliado, +3–4 días) | Revisión a escala (§5): clústeres, aprobación por lote con muestreo de auditoría, presupuesto de revisión. |
| **ETI-S4C — Consolidación y Rule Packs** *(nuevo, 7–10 días, tras S4B)* | Consolidación por Fuente (con evolución temporal) y entre Fuentes, flujo hacia DSL, estructura del **Rule Pack** versionado y su visor/comparador, estados `DRAFT/SHADOW/INFORMATIVE`. **Aceptación:** una regla consolidada enlaza a todos sus candidatos y videos de origen; el Rule Pack es inmutable y comparable con el anterior; ninguna regla entra sin pasar la política del Tema. |
| **ETI-S8** (modificado) | `EtiDecisionService` sirve únicamente Rule Packs en estado `SHADOW`/`INFORMATIVE`. |
| **ETI-T2 / T3** | Reutilizan el panel y el pipeline; solo requieren su Schema Pack, política y adaptador de instrumento (v2.2 §7). |

**Hito de demostración (M1):** tras S3, mostrar el canal de Opción Sigma con los 722 videos descubiertos y clasificados y ≥ 30 con estrategias extraídas, antes de escalar al resto de Fuentes. Si M1 no cumple los criterios de calidad, se corrige antes de avanzar (no se escala un pipeline que no funciona a pequeña escala).

**Orden:** `S0 → PLT-A1 → S1 → (S1B ∥ S2 ∥ S2B → S3[M1] → S4 → S4B → S4C) → S5 → S6 → S6B → S7 → S8 → S9 → S10`, luego T2/T3.

**Estimación actualizada:** MVP de Opciones ≈ **22–26 semanas** (v2.2: 20–24), con parte en paralelo; más 4–8 de paper trading. Estimación mía, a revisar tras S0. El mayor factor de variación sigue siendo D18.

---

## 9. Decisiones nuevas

| ID | Decisión | Recomendación |
|----|----------|---------------|
| D18 | **Vía de texto para el backfill** | Construir `TranscriptProvider` con carga masiva + cola priorizada ya; evaluar `LicensedProvider` en S0 (términos, coste); no construir sobre métodos que evadan controles de acceso. |
| D19 | Ventana de vigencia y orden del backfill | 3 años, orden por relevancia, editable por Fuente. |
| D20 | Capacidad de revisión y política de aprobación por lote | Definir elementos/día y % de muestreo de auditoría; fusión automática solo de duplicados exactos. |
| D21 | Presupuesto de backfill por Fuente | USD ___ por Fuente, calibrado con la estimación de S0. |
| D22 | Criterio «apta para el robot» (Rule Pack) | E2 superado + evidencia forward, política sellada del Tema. |

---

## 10. Criterios de aceptación transversales (adición)

- Ninguna Fuente se registra sin `channel_id` verificado.
- Ningún proceso masivo arranca sin estimación aceptada por el usuario ni sin tope de presupuesto.
- El panel nunca presenta «sin texto» como «sin reglas»: son estados distintos.
- Aprobaciones por lote siempre con muestra de auditoría registrada.
- Todo Rule Pack es inmutable, versionado, comparable y trazable hasta videos/timestamps.
- El robot solo ve Rule Packs publicados; nunca candidatos, reglas sin validar ni afirmaciones de terceros.
- Añadir una Fuente o un Tema no requiere cambios de código en el pipeline (solo configuración, Schema Pack y política).

---

## 11. Adenda al prompt maestro para Antigravity (reglas 31–38)

```text
31. El flujo central de ETI es: URL de canal → resolución verificada → alcance y estimación → descubrimiento de videos (metadatos, API oficial) → filtro de relevancia y tipo de contenido → obtención de texto por vías autorizadas → extracción por Schema Pack del Tema → revisión humana a escala → consolidación por Fuente y entre Fuentes → DSL → validación → Rule Pack versionado → EtiDecisionService.
32. Construye el panel «Agregar Fuente»: acepta @handle, /channel/UC…, /c/, /user/, URL de video o lista y nombre del canal (búsqueda con candidatos). Nunca registres una Fuente sin channel_id verificado por la API. Muestra previsualización, configuración (Tema, rol, prioridad, alcance, exclusiones, ventana de vigencia, tope de presupuesto) y una estimación (dry run) antes de lanzar el backfill.
33. El backfill es reanudable, idempotente y pausable, procesa por relevancia descendente dentro de la ventana de vigencia, corta al alcanzar el tope de presupuesto y muestra un embudo en vivo (descubiertos → relevantes → con texto → extraídos → revisados → aprobados → consolidados).
34. Obtención de texto vía interfaz TranscriptProvider. Implementa UserUploadProvider (carga masiva .srt/.vtt/.txt/.json con emparejamiento automático y confirmación) y la cola priorizada de texto pendiente. Deja LicensedProvider como esqueleto inactivo. NO implementes métodos que evadan controles de acceso ni que contravengan términos de servicio. «Sin texto» y «sin reglas» son estados distintos.
35. Clasifica cada video por tipo (TUTORIAL, LIVE_SESSION, RECAP, MARKET_ANALYSIS, INTERVIEW, PROMO) y usa plantillas de extracción distintas por tipo y por Tema (Schema Pack). Usa un glosario de dominio para normalizar errores de transcripción y registra la confianza del texto.
36. Revisión a escala: clústeres de candidatos, fusión automática solo de duplicados exactos (mismo DSL normalizado), aprobación por lote con muestreo de auditoría obligatorio y presupuesto de revisión. Todo lo demás lo decide un humano.
37. Consolidación: por Fuente (con evolución temporal; la versión vigente pesa más) y entre Fuentes (Playbook). Consenso no es validez. Solo lo expresable en DSL y validado bajo la política sellada del Tema, con evidencia forward, entra en un Rule Pack. El Rule Pack es inmutable, versionado y comparable; el robot solo ve Rule Packs publicados.
38. Corte vertical obligatorio (hito M1 tras S3): canal de Opción Sigma completo descubierto y clasificado, ≥ 30 videos con texto aportado y extraídos, métricas frente al golden set. No escales a más Fuentes hasta superar M1. Añadir Fuentes o Temas debe ser configuración, no cambios de código.

ORDEN: S0 → PLT-A1 → S1 → (S1B ∥ S2 ∥ S2B → S3[M1] → S4 → S4B → S4C) → S5 → S6 → S6B → S7 → S8 → S9 → S10; luego T2/T3.
S0 incluye además: verificación de cuota/limites reales con @OPCIONSIGMA, medición de coste con 10 videos de tipos distintos y decisión D18.
```
