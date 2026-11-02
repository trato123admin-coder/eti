# eTrade Trading Intelligence (ETI)

## Arquitectura completa y plan de construcción con Antigravity

**Versión:** 1.0\
**Fecha:** 30 de octubre de 2026\
**Producto:** eTrade Trading Intelligence (ETI)\
**Plataforma anfitriona:** eTrade\
**Stack conocido:** Python, Node.js, Supabase/PostgreSQL y
Next.js/Vercel\
**Mercado inicial:** opciones CALL/PUT intradía sobre activos de Estados
Unidos

------------------------------------------------------------------------

## 1. Resumen ejecutivo

ETI será un módulo independiente dentro de eTrade. Su propósito es
descubrir contenido útil de canales de YouTube, filtrar videos
relacionados con trading y mercados, procesar transcripciones cuando el
acceso esté permitido, extraer estrategias y operaciones, almacenar
únicamente el conocimiento seleccionado y proporcionar información
validada al robot de trading.

ETI no debe copiar señales de terceros ni asumir que una afirmación de
un influencer demuestra rentabilidad. Debe recopilar conocimiento,
conservar evidencias, formular hipótesis, validar estrategias de forma
independiente y entregar al robot únicamente información que haya
superado los controles definidos.

### Objetivos

-   Explorar canales con cientos o miles de videos sin descargar ni
    analizar inicialmente todas sus transcripciones.
-   Clasificar videos por relevancia para opciones CALL/PUT intradía,
    análisis de mercado, volatilidad, indicadores y gestión de riesgo.
-   Analizar en profundidad solo los videos seleccionados por el filtro.
-   Extraer estrategias, reglas, operaciones, condiciones de mercado,
    resultados declarados y referencias temporales.
-   Mantener trazabilidad desde cada dato extraído hasta su fuente
    original y segmento del video.
-   Evaluar estrategias mediante backtesting independiente, pruebas
    fuera de muestra y paper trading.
-   Exponer una API de consulta para el robot, inicialmente en modo de
    solo lectura.

### Resultado esperado del MVP

Un administrador registra un canal; ETI descubre sus videos, prioriza
los relevantes, analiza los que puede procesar, extrae conocimiento
estructurado y lo presenta para revisión. El robot puede consultar
estrategias que hayan superado los controles definidos, inicialmente sin
ejecutar operaciones basándose en ETI.

------------------------------------------------------------------------

## 2. Alcance, exclusiones y principios

### 2.1 Incluido

-   Administración de canales, autores, playlists y videos.
-   Sincronización incremental y detección de nuevos videos.
-   Filtro de relevancia basado en metadatos y, cuando sea necesario,
    muestras de texto.
-   Obtención y procesamiento de transcripciones mediante mecanismos
    autorizados.
-   Extracción asistida por IA de estrategias, operaciones y reglas.
-   Base de conocimiento en Supabase/PostgreSQL.
-   Revisión humana, puntuación de evidencia y versionado de
    estrategias.
-   Backtesting y validación cuando existan datos históricos adecuados.
-   API de consulta para el robot y registro de decisiones.

### 2.2 Fuera del alcance inicial

-   Entrenar un modelo fundacional propio.
-   Copiar automáticamente señales o ejecutar operaciones basándose en
    afirmaciones de influencers.
-   Garantizar rentabilidad o asumir que un resultado publicado es
    verificable.
-   Automatizar la descarga masiva de videos o transcripciones sin
    permisos.
-   Sustituir el broker, la API de ejecución o el motor de riesgo
    existente.
-   Asumir que IC Markets/cTrader soporta opciones estadounidenses. La
    conectividad para opciones se evaluará por separado.

### 2.3 Principios no negociables

1.  **Trazabilidad:** todo conocimiento debe enlazarse con canal, video
    y timestamp.
2.  **No invención:** los campos no presentes se guardan como `NULL` y
    se declaran como desconocidos.
3.  **Separación:** conocimiento de terceros, hipótesis, pruebas y
    estrategias autorizadas son estados distintos.
4.  **Validación independiente:** una afirmación del autor no equivale a
    evidencia de rentabilidad.
5.  **Seguridad por defecto:** ETI no puede enviar órdenes al broker en
    el MVP.
6.  **Coste controlado:** procesamiento escalonado, por lotes y con
    límites configurables.
7.  **Reproducibilidad:** registrar versiones de modelos, prompts,
    esquemas, datos y reglas utilizadas.

------------------------------------------------------------------------

## 3. Arquitectura general

La arquitectura separa ingesta, extracción, persistencia, validación y
consulta del robot. Los procesos pesados se ejecutan en workers Python;
Node.js puede exponer endpoints integrados con la API existente;
Supabase almacena datos y aplica controles de acceso; Next.js presenta
el panel.

``` text
Canales / YouTube
       |
       v
YouTube Metadata Collector
       |
       v
Smart Content Filtering Engine
       |----------------------> Rechazado / solo metadatos mínimos
       |
       v
Transcript Access & Segmentation
       |
       v
AI Knowledge Extractor
       |
       v
Supabase / PostgreSQL (ETI Knowledge Base)
       |
       +----> Human Review & Evidence Scoring
       |
       v
Strategy Intelligence
       ^ 
       |
Historical Options Data
       |
       v
Backtesting / Out-of-sample / Paper Trading
       |
       v
Validated Strategy Repository
       |
       v
Decision Intelligence API (read-only al inicio)
       |
       v
eTrade Robot --> Risk Controls --> Existing execution layer
```

### 3.1 Responsabilidades por componente

  -----------------------------------------------------------------------
  Componente                          Responsabilidad
  ----------------------------------- -----------------------------------
  Next.js / Vercel                    Panel administrativo, gestión de
                                      fuentes, revisión y visualización.

  Node.js API                         Autenticación, endpoints,
                                      integración con backend existente y
                                      autorización.

  Python workers                      Ingesta, clasificación,
                                      transcripción permitida,
                                      extracción, normalización y
                                      backtesting.

  Supabase / PostgreSQL               Persistencia, relaciones,
                                      auditoría, estados, permisos y
                                      consultas.

  LLM                                 Clasificar contenido y convertir
                                      segmentos en datos estructurados;
                                      no decide ejecución.

  Proveedor de datos                  Suministrar históricos de opciones
                                      y mercado según licencia y
                                      disponibilidad.

  Robot eTrade                        Consultar resultados y combinarlos
                                      con datos actuales y controles de
                                      riesgo.
  -----------------------------------------------------------------------

### 3.2 Desacoplamiento

ETI debe poder procesar conocimiento aunque el robot esté apagado. El
robot debe poder seguir funcionando si ETI está temporalmente
indisponible. La API debe tener contratos versionados y fallar de forma
segura: si no hay respuesta válida, no generar una señal de operación.

Antigravity debe inspeccionar el repositorio real antes de definir
carpetas o componentes. La estructura siguiente es orientativa, no una
imposición:

``` text
etrade/
├── frontend/
│   └── modules/
│       └── trading-intelligence/
├── backend/
│   ├── node/
│   │   └── trading-intelligence-api/
│   └── python/
│       └── trading_intelligence/
│           ├── collectors/
│           ├── transcripts/
│           ├── extractors/
│           ├── knowledge/
│           ├── strategies/
│           ├── backtesting/
│           ├── validation/
│           └── decision_engine/
├── database/
│   └── migrations/
└── docs/
    └── trading-intelligence/
```

------------------------------------------------------------------------

## 4. YouTube Knowledge Collector y Smart Content Filtering Engine

Este es un componente central y obligatorio desde el MVP. Su objetivo es
que un canal con 1.000, 5.000 o más videos pueda explorarse sin
descargar o analizar profundamente todas las transcripciones.

### 4.1 Descubrimiento de canales y videos

El sistema registra canales y obtiene identificadores de videos y
metadatos mediante interfaces permitidas. Para canales grandes, el
descubrimiento se pagina y guarda el cursor o la fecha de última
sincronización. Las siguientes ejecuciones buscan contenido nuevo o
actualizado, no repiten todo el historial.

**Datos del canal:**

-   `source_id`
-   plataforma
-   `channel_id`
-   nombre
-   URL
-   descripción
-   idioma si se conoce
-   prioridad
-   estado activo/inactivo
-   fecha de registro
-   última sincronización

**Datos del video:**

-   `video_id`
-   `source_id`
-   título
-   descripción
-   fecha de publicación
-   duración
-   URL
-   playlist
-   idioma si se conoce
-   score de relevancia
-   estado de procesamiento
-   fecha de última comprobación

Requisitos:

-   Deduplicación por identificador estable del video.
-   Sincronización manual y programada.
-   Límites de cuota, reintentos con backoff y registro de errores.
-   Paginación para canales con miles de videos.
-   Sincronización incremental e idempotente.

### 4.2 Filtro de relevancia por etapas

  -----------------------------------------------------------------------
  Etapa                   Entrada                 Acción
  ----------------------- ----------------------- -----------------------
  1\. Metadatos           Título, descripción,    Clasificación rápida
                          fecha, duración         por términos, reglas y
                                                  modelo ligero si
                                                  procede.

  2\. Selección           Puntuación inicial      Descartar, revisar o
                                                  enviar a análisis de
                                                  transcripción.

  3\. Texto               Transcripción           Procesar por bloques y
                          disponible y autorizada localizar segmentos
                                                  relevantes.

  4\. Extracción          Segmentos relevantes    Extraer estrategias,
                                                  operaciones, reglas y
                                                  evidencias.

  5\. Revisión            Datos extraídos         Aprobar, corregir,
                                                  rechazar o marcar como
                                                  incierto.
  -----------------------------------------------------------------------

**Aclaración técnica:** para identificar segmentos relevantes de un
video seleccionado puede ser necesario procesar su transcripción
completa o recorrerla por bloques. Esto no obliga a almacenar la
transcripción completa. ETI debe guardar por defecto metadatos,
referencias temporales, resúmenes y datos estructurados permitidos.

### 4.3 Taxonomía inicial

  -----------------------------------------------------------------------
  Categoría               Prioridad               Ejemplos
  ----------------------- ----------------------- -----------------------
  Opciones CALL/PUT       Muy alta                SPY, QQQ, SPX, 0DTE,
  intradía                                        contratos y ejecución.

  Sesiones reales /       Muy alta                Operaciones explicadas,
  recaps                                          entradas, salidas y
                                                  resultados.

  Estrategias técnicas    Alta                    EMA, VWAP, price
                                                  action, ruptura,
                                                  retest, volumen.

  Volatilidad y flujo     Alta                    IV, GEX, gamma, OI,
                                                  flujo de opciones.

  Gestión de riesgo       Alta                    Tamaño, stop, pérdida
                                                  diaria, disciplina.

  Análisis general de     Media                   Contexto macro, niveles
  mercado                                         y régimen.

  Cursos generales /      Baja                    Contenido sin reglas
  contenido promocional                           operativas nuevas.

  Contenido ajeno al      Descartar               Viajes, vida personal,
  trading                                         entretenimiento.
  -----------------------------------------------------------------------

### 4.4 Puntuación inicial

  Score     Tratamiento
  --------- ----------------------------------------
  90--100   Procesamiento prioritario.
  70--89    Procesamiento normal.
  40--69    Revisión adicional o análisis parcial.
  0--39     Descartar del análisis profundo.

Los umbrales son configurables y deben calibrarse con ejemplos
etiquetados. No representan una precisión garantizada. Conservar un
estado mínimo de exclusión y la razón del descarte ayuda a evitar
clasificar repetidamente el mismo video.

### 4.5 Acceso a transcripciones

-   Usar subtítulos/transcripciones solo mediante interfaces, permisos y
    mecanismos autorizados.
-   YouTube Data API permite consultar metadatos, pero no debe asumirse
    que proporciona automáticamente la transcripción de cualquier video.
-   Registrar estados: `AVAILABLE`, `NOT_AVAILABLE`,
    `ACCESS_RESTRICTED`, `PENDING` y `ERROR`.
-   No automatizar extracción que eluda controles de acceso,
    restricciones técnicas o términos de servicio.
-   No guardar por defecto la transcripción íntegra.
-   Si un video no tiene transcripción accesible, conservar sus
    metadatos y marcarlo para revisión o para una fuente alternativa
    autorizada.

### 4.6 Resultado esperado del filtrado

Ejemplo ilustrativo de un canal de 1.000 videos:

1.  Se consultan los metadatos de los 1.000 videos.
2.  El filtro selecciona 180 candidatos.
3.  Se consigue texto autorizado para 150.
4.  El análisis semántico encuentra segmentos útiles en 90.
5.  Se extraen estrategias, reglas u operaciones de esos 90.
6.  Solo se guarda conocimiento estructurado, evidencia y referencias.

Los números son ilustrativos. El sistema no debe asumir una tasa fija de
selección.

------------------------------------------------------------------------

## 5. AI Knowledge Extractor

### 5.1 Tipos de entidades a extraer

-   **Strategy:** nombre, mercado, activo, dirección, temporalidad y
    descripción.
-   **Rule:** condición de entrada, confirmación, invalidación, stop,
    objetivo y salida.
-   **Operation:** activo, CALL/PUT, strike, vencimiento, prima, tamaño,
    hora, salida y resultado si se menciona.
-   **Market condition:** tendencia, rango, volatilidad, sesión, eventos
    y contexto.
-   **Indicator:** nombre, parámetros, función y temporalidad.
-   **Evidence:** video, timestamp inicial/final, tipo de evidencia y
    referencia al segmento.
-   **Risk lesson:** pérdida, error, regla de disciplina o condición de
    no operar.

### 5.2 Clasificación de afirmaciones y evidencia

  -----------------------------------------------------------------------
  Clase                               Definición
  ----------------------------------- -----------------------------------
  `EXPLICIT_RULE`                     El trader expresa una regla de
                                      forma directa.

  `INFERRED_RULE`                     La IA deduce una posible regla;
                                      requiere revisión.

  `LIVE_CLAIM`                        El trader comunica una operación
                                      durante una sesión.

  `RECAP_CLAIM`                       El trader relata posteriormente una
                                      operación.

  `HISTORICAL_BACKTEST`               Resultado de una prueba sobre datos
                                      históricos.

  `BROKER_VERIFIED`                   Evidencia verificable mediante
                                      registro/extracto completo y
                                      contextualizado.

  `UNVERIFIED_CLAIM`                  Afirmación de resultado sin
                                      evidencia suficiente.
  -----------------------------------------------------------------------

No confundir backtesting con trading real. Backtesting usa datos
históricos; live/forward trading se produce en mercado; una cuenta real
verificada requiere documentación suficiente. `BROKER_VERIFIED` solo se
asigna tras una revisión definida, nunca por inferencia del modelo.

### 5.3 Esquema JSON ilustrativo

``` json
{
  "video_id": "youtube_video_id",
  "relevance": {
    "score": 92,
    "categories": ["OPTIONS_INTRADAY", "LIVE_TRADING"],
    "decision": "PROCESS"
  },
  "strategies": [
    {
      "name": "EMA_VWAP_MOMENTUM",
      "underlying": "SPY",
      "direction": ["CALL", "PUT"],
      "timeframes": ["2m", "5m"],
      "indicators": [
        {"name": "EMA", "parameters": {"periods": [9, 20]}},
        {"name": "VWAP", "parameters": {}}
      ],
      "market_regime": ["TRENDING"],
      "entry_rules": [],
      "confirmation_rules": [],
      "invalidation_rules": [],
      "exit_rules": [],
      "rule_type": "MIXED",
      "confidence": 0.82,
      "evidence": [
        {
          "start_seconds": 480,
          "end_seconds": 960,
          "evidence_type": "EXPLICIT_RULE"
        }
      ]
    }
  ],
  "operations": [],
  "unknown_fields": [],
  "review_status": "PENDING"
}
```

Este contrato es ilustrativo. Debe implementarse como esquema validado
(Pydantic/JSON Schema), versionarse y rechazar campos inesperados o
tipos inválidos.

### 5.4 Pipeline de extracción

1.  Obtener el texto autorizado y dividirlo en bloques con solapamiento
    controlado.
2.  Clasificar bloques: trading relevante, irrelevante o ambiguo.
3.  Extraer entidades y relaciones de los bloques relevantes.
4.  Consolidar reglas repetidas sin borrar evidencias de origen.
5.  Detectar contradicciones entre partes del video o entre videos del
    mismo autor.
6.  Validar tipos, rangos, campos obligatorios y timestamps.
7.  Guardar extracción y confianza; enviar afirmaciones críticas a
    revisión humana.
8.  Mantener versiones del prompt, modelo y esquema usados para
    reproducibilidad.

La IA debe distinguir una regla expresada literalmente de una
interpretación. Si un trader dice «esperé confirmación», el sistema no
debe inventar que la confirmación fue un cruce de EMA.

------------------------------------------------------------------------

## 6. Trading Knowledge Base: modelo de datos

El diseño inicial utiliza tablas con prefijo `eti_`. Antigravity debe
revisar el esquema existente y generar migraciones compatibles, con
claves foráneas, índices, políticas RLS y auditoría.

  -----------------------------------------------------------------------
  Tabla                               Propósito / campos principales
  ----------------------------------- -----------------------------------
  `eti_sources`                       Canales/autores: `source_id`,
                                      plataforma, `channel_id`, nombre,
                                      URL, idioma, prioridad, activo.

  `eti_videos`                        Video: `video_id`, `source_id`,
                                      título, descripción, fecha,
                                      duración, URL, score, estado.

  `eti_video_segments`                Segmentos relevantes: video,
                                      segundos inicial/final, tema,
                                      resumen, tipo de evidencia.

  `eti_transcript_jobs`               Estado de acceso/procesamiento,
                                      método, error y fecha; no almacenar
                                      texto completo por defecto.

  `eti_extraction_runs`               Modelo, versión de prompt, versión
                                      de esquema, coste estimado, estado
                                      y timestamps.

  `eti_strategies`                    Estrategia canónica, activo,
                                      dirección, temporalidad,
                                      descripción y estado.

  `eti_strategy_rules`                Reglas de entrada, confirmación,
                                      stop, invalidación, salida y
                                      parámetros.

  `eti_operations`                    Operaciones relatadas: contrato,
                                      fechas, primas, tamaño, P&L, costes
                                      y campos desconocidos.

  `eti_indicators`                    Indicadores, parámetros,
                                      temporalidad y función.

  `eti_market_conditions`             Régimen, volatilidad, sesión,
                                      eventos y contexto.

  `eti_evidence`                      Fuente, video, segmento, tipo,
                                      afirmación soportada, verificación
                                      y revisor.

  `eti_reviews`                       Decisiones humanas, cambios,
                                      comentarios, usuario y fecha.

  `eti_backtests`                     Dataset, período, supuestos,
                                      costes, versión de estrategia y
                                      métricas.

  `eti_strategy_versions`             Versiones inmutables de reglas y
                                      parámetros.

  `eti_strategy_scores`               Score por dimensión, muestra,
                                      evidencia y fecha.

  `eti_validated_strategies`          Estrategias autorizadas para
                                      consulta del robot.

  `eti_robot_queries`                 Consultas, contexto, versión de
                                      estrategia y respuesta entregada al
                                      robot.

  `eti_audit_log`                     Cambios críticos, aprobaciones,
                                      accesos y acciones administrativas.
  -----------------------------------------------------------------------

### 6.1 Relaciones principales

``` text
eti_sources 1---N eti_videos
eti_videos 1---N eti_video_segments
eti_videos 1---N eti_extraction_runs
eti_strategies 1---N eti_strategy_versions
eti_strategy_versions 1---N eti_strategy_rules
eti_strategies N---N eti_evidence (mediante tabla de relación)
eti_strategies 1---N eti_backtests
eti_strategies 1---N eti_strategy_scores
eti_validated_strategies -> strategy_version_id
eti_robot_queries -> validated_strategy_version_id
```

### 6.2 Reglas de persistencia

-   UUID como claves internas y conservar IDs externos de YouTube como
    identificadores únicos.
-   Fechas en UTC; almacenar zona/fecha local de mercado cuando sea
    relevante.
-   Importes con `NUMERIC`/`DECIMAL`, nunca `FLOAT` para dinero.
-   Campos desconocidos como `NULL`, acompañados de estado de
    completitud.
-   Historial de versiones; no sobrescribir una regla aprobada sin crear
    nueva versión.
-   Aplicar RLS y permisos mínimos por rol.
-   Indexar `video_id`, `source_id`, `status`, `published_at`,
    `strategy_id` y campos de búsqueda frecuentes.

------------------------------------------------------------------------

## 7. Strategy Intelligence y validación

### 7.1 Flujo de validación

1.  Convertir estrategia extraída en reglas precisas y ejecutables.
2.  Marcar parámetros no definidos y solicitar definición/revisión.
3.  Seleccionar dataset adecuado para el activo y contrato.
4.  Definir hipótesis de ejecución: bid/ask, latencia, spread,
    comisiones, slippage y liquidez.
5.  Ejecutar backtest histórico reproducible.
6.  Separar datos de desarrollo, validación y prueba fuera de muestra.
7.  Ejecutar walk-forward y análisis por régimen/horario.
8.  Realizar pruebas de robustez y sensibilidad.
9.  Pasar a paper trading y comparar señal teórica con ejecución
    simulada.
10. Aprobar, mantener en observación o rechazar con justificación.

### 7.2 Métricas mínimas

  -----------------------------------------------------------------------
  Métrica                             Definición / uso
  ----------------------------------- -----------------------------------
  Win rate                            Porcentaje de operaciones
                                      ganadoras; no usar aisladamente.

  Profit factor                       Ganancia bruta / pérdida bruta.

  Expectancy                          Resultado esperado por operación,
                                      neto de costes.

  Max drawdown                        Mayor caída de la curva de capital.

  Average win/loss                    Tamaño medio de ganadoras y
                                      perdedoras.

  Net P&L                             Resultado neto de comisiones,
                                      spreads y slippage.

  Sharpe / Sortino                    Rendimiento ajustado por riesgo;
                                      interpretar según frecuencia.

  Sample size                         Cantidad de operaciones y período
                                      cubierto.

  Performance by regime               Resultados en tendencia, rango,
                                      alta/baja volatilidad y horarios.
  -----------------------------------------------------------------------

### 7.3 Datos históricos necesarios para opciones

Los precios del subyacente por sí solos no permiten simular de forma
fiable el rendimiento de contratos CALL/PUT. Se requieren, según
disponibilidad:

-   Cadena histórica de opciones.
-   Bid/ask y, cuando sea posible, trades.
-   Volumen y open interest.
-   Volatilidad implícita.
-   Greeks.
-   Strike y vencimiento.
-   Multiplicador y ajustes corporativos.
-   Datos de liquidez.
-   Comisiones, spread y slippage.

Deben modelarse vencimiento, ejercicio/liquidación y spreads. Evaluar
proveedores como ThetaData, Massive, ORATS, Cboe, Tradier e Interactive
Brokers. La disponibilidad, cobertura, licencia, profundidad histórica y
coste deben verificarse antes de seleccionar uno. No asumir que existe
un plan gratuito suficiente para backtesting de opciones.

### 7.4 Estados de estrategia

  -----------------------------------------------------------------------
  Estado                              Significado
  ----------------------------------- -----------------------------------
  `DISCOVERED`                        Detectada en una fuente.

  `STRUCTURED`                        Reglas normalizadas y pendientes de
                                      validación.

  `BACKTEST_PASSED`                   Superó criterios históricos
                                      predefinidos.

  `PAPER_TRADING`                     En evaluación prospectiva sin
                                      dinero real.

  `VALIDATED`                         Aprobada para consulta según
                                      política y versión específica.

  `SUSPENDED`                         Pausada por deterioro, anomalía o
                                      revisión.

  `REJECTED`                          No cumple criterios o no es
                                      reproducible.
  -----------------------------------------------------------------------

Los umbrales de aprobación deben ser configurables y definidos antes de
observar los resultados para reducir sobreajuste. La validación debe
considerar tamaño de muestra y múltiples pruebas.

------------------------------------------------------------------------

## 8. Decision Intelligence API e integración con el robot

### 8.1 Principio

La API inicial será de solo lectura. El robot enviará contexto de
mercado y recibirá estrategias candidatas, reglas, métricas y
restricciones. La decisión final debe pasar por el motor determinístico
de riesgo de eTrade.

### 8.2 Endpoints conceptuales

  ------------------------------------------------------------------------
  Método / endpoint                    Función
  ------------------------------------ -----------------------------------
  `GET /api/eti/v1/strategies`         Listar estrategias autorizadas con
                                       filtros.

  `GET /api/eti/v1/strategies/{id}`    Consultar detalle y versión.

  `POST /api/eti/v1/recommendations`   Evaluar compatibilidad con contexto
                                       de mercado.

  `GET /api/eti/v1/health`             Estado del servicio y dependencias.

  `GET /api/eti/v1/metrics`            Métricas de consulta y
                                       disponibilidad, acceso restringido.
  ------------------------------------------------------------------------

### 8.3 Ejemplo de respuesta

``` json
{
  "symbol": "SPY",
  "market_regime": "TRENDING_UP",
  "strategy_id": "uuid",
  "strategy_version": 3,
  "status": "VALIDATED",
  "candidate_direction": "CALL",
  "confidence": 0.78,
  "risk_level": "HIGH",
  "entry_conditions": [
    "EMA9_ABOVE_EMA20",
    "PRICE_ABOVE_VWAP",
    "MOMENTUM_CONFIRMED"
  ],
  "invalidation": ["LOSS_OF_TREND_STRUCTURE"],
  "evidence_summary": {
    "backtest_trades": 420,
    "out_of_sample": true,
    "paper_trading": "COMPLETED"
  },
  "execution_allowed": false,
  "as_of": "2026-10-30T00:00:00Z"
}
```

Los valores son ilustrativos. La confianza no debe presentarse como
probabilidad de ganar si no está calibrada estadísticamente.
`execution_allowed` debe ser `false` por defecto y no debe ser
controlado por la salida libre de un LLM.

### 8.4 Controles del robot

-   Validar que la estrategia esté `VALIDATED` y que la versión no esté
    suspendida.
-   Comprobar que el activo, horario, régimen y vencimiento estén dentro
    del ámbito autorizado.
-   Aplicar límites independientes de exposición, pérdida diaria,
    tamaño, liquidez y spread.
-   Rechazar respuestas incompletas, caducadas, no autenticadas o con
    esquema inválido.
-   Registrar decisión, contexto, estrategia/versión, resultado y motivo
    de rechazo.
-   Si ETI no responde, el robot debe seguir su política segura
    preexistente, sin inventar señal.

------------------------------------------------------------------------

## 9. Interfaz de administración

Agregar un apartado ETI al menú de eTrade respetando diseño, navegación
y permisos actuales.

  -----------------------------------------------------------------------
  Pantalla                            Funciones
  ----------------------------------- -----------------------------------
  Overview                            Canales activos, videos nuevos,
                                      pendientes, estrategias
                                      descubiertas y estados.

  Knowledge Sources                   Registrar/editar canales, autores,
                                      prioridad, categorías y
                                      sincronización.

  Video Library                       Buscar videos, score, categoría,
                                      estado, razón de descarte y
                                      reintentar.

  AI Extraction                       Ver extracción, evidencia, campos
                                      faltantes, confianza y versión del
                                      modelo.

  Knowledge Base                      Consultar estrategias, reglas,
                                      operaciones, indicadores y
                                      condiciones.

  Review Queue                        Aprobar, corregir, rechazar o
                                      marcar como incierto.

  Strategy Lab                        Configurar datasets, ejecutar
                                      pruebas y revisar métricas.

  Validated Strategies                Versiones aprobadas, límites, fecha
                                      de revisión y estado.

  Robot Intelligence                  Consultas del robot, estrategia
                                      utilizada y trazabilidad.
  -----------------------------------------------------------------------

### Panel de resumen

-   Canales registrados y activos.
-   Videos descubiertos, relevantes, descartados y pendientes.
-   Videos procesados y fallidos.
-   Estrategias y operaciones extraídas.
-   Extracciones pendientes de revisión.
-   Estrategias por estado de validación.
-   Últimos backtests y métricas principales.
-   Consultas recientes del robot y rechazos por control de riesgo.

------------------------------------------------------------------------

## 10. Seguridad, calidad y operación

### 10.1 Seguridad

-   Reutilizar autenticación y autorización de eTrade.
-   Separar roles: administrador, revisor y consulta/servicio del robot.
-   Aplicar RLS en Supabase y mantener secretos solo en backend.
-   No exponer claves de API, tokens de YouTube o credenciales de
    proveedores al navegador.
-   Validar y limitar todas las entradas; proteger endpoints con
    autenticación y rate limiting.
-   Registrar aprobaciones, cambios de reglas y operaciones
    administrativas.

### 10.2 Resiliencia y observabilidad

-   Colas con estados `PENDING`, `RUNNING`, `SUCCEEDED`, `FAILED` y
    `RETRY`.
-   Reintentos limitados con backoff exponencial y cola de errores.
-   Idempotencia por video, tarea y versión de extracción.
-   Métricas de duración, fallos, coste estimado, consumo de tokens y
    cuota de API.
-   Logs estructurados con `correlation_id` y sin datos sensibles
    innecesarios.
-   Alertas para workers detenidos, cuotas agotadas y fallos repetidos.

### 10.3 Control de costes

-   Primero metadatos; luego transcripción solo para videos
    seleccionados.
-   Usar clasificador económico y reservar un modelo más capaz para
    extracción.
-   Procesar por lotes y limitar concurrencia.
-   Evitar reanalizar videos sin cambios o sin motivo.
-   Guardar hashes/versiones de contenido y resultados para
    reutilización.
-   Establecer límites diarios/mensuales por canal y proveedor.

### 10.4 Copyright y uso de contenido

El sistema debe respetar las condiciones de YouTube y los derechos de
los creadores. No descargar ni almacenar videos o transcripciones
completas por defecto. Utilizar mecanismos de acceso permitidos;
conservar metadatos, enlaces, timestamps, resúmenes y datos derivados
dentro de los límites legales y contractuales aplicables. Antes de
desplegar el colector, verificar las condiciones vigentes de cada
API/proveedor.

------------------------------------------------------------------------

## 11. Plan de construcción con Antigravity

Antigravity debe trabajar por fases con entregables demostrables. No se
debe generar una implementación monolítica en una sola instrucción.

  ----------------------------------------------------------------------------------
  Fase             Trabajo                       Estimación Entregable / criterio de
                                                orientativa avance
  ---------------- ------------------ --------------------- ------------------------
  0                Auditoría del                  3--5 días Documento aprobado; sin
                   repositorio,                             cambios funcionales.
                   arquitectura,                            
                   dependencias y                           
                   plan de                                  
                   integración.                             

  1                Migraciones,                   4--6 días Módulo y CRUD inicial
                   seguridad, tablas                        probado.
                   ETI, navegación y                        
                   pantallas base.                          

  2                Descubrimiento                 5--8 días Canal grande escaneado
                   YouTube,                                 sin duplicados.
                   paginación,                              
                   sincronización y                         
                   filtro por                               
                   metadatos.                               

  3                Acceso autorizado             6--10 días Estrategias y
                   a transcripciones,                       operaciones con
                   segmentación,                            evidencias.
                   extracción y                             
                   revisión.                                

  4                Normalización,                8--12 días Primer backtest
                   datos de opciones,                       reproducible.
                   backtesting y                            
                   evaluación.                              

  5                API de consulta,               5--8 días Modo
                   integración del                          lectura/recomendación.
                   robot y controles                        
                   determinísticos.                         

  6                Paper trading,              2--4 semanas Piloto operativo con
                   observabilidad,                          criterios de aceptación.
                   ajustes y                                
                   despliegue                               
                   controlado.                              
  ----------------------------------------------------------------------------------

**Estimación global orientativa:** aproximadamente 7--11 semanas para
construir el primer sistema integrado, más el período de paper trading.
La estimación puede cambiar según el resultado de la auditoría, la
disponibilidad de transcripciones y el proveedor de datos.

### 11.1 Fase 0: auditoría obligatoria

Antes de programar:

1.  Inspeccionar repositorios y ramas actuales.
2.  Identificar estructura de frontend, backend, workers y despliegue.
3.  Revisar esquema Supabase, migraciones, RLS y autenticación.
4.  Identificar patrones de API, logging, colas y scheduler ya
    existentes.
5.  Documentar módulos reutilizables y puntos de integración.
6.  Proponer estructura ETI adaptada al repositorio real.
7.  Entregar riesgos, dependencias y estimación revisada.

**No iniciar Fase 1 hasta que el usuario apruebe el resultado de la
auditoría.**

### 11.2 MVP recomendado

-   Comenzar con cinco canales priorizados.
-   Objetivo de prueba: 100--200 videos relevantes, no todos los videos
    de cada canal.
-   Implementar clasificación por metadatos y análisis profundo solo
    para seleccionados.
-   Extraer estrategias y operaciones con evidencia temporal.
-   Revisión humana antes de considerar una regla estructurada.
-   Construir un primer backtest reproducible cuando se disponga de
    datos adecuados.
-   Exponer consulta de estrategias en modo lectura; no ejecutar
    operaciones.

------------------------------------------------------------------------

## 12. Criterios de aceptación y pruebas

### 12.1 Colector y filtro

-   Puede paginar un canal con 1.000 o más videos sin duplicar
    registros.
-   Una segunda sincronización solo procesa nuevos/actualizados según la
    política configurada.
-   Los videos irrelevantes no generan tareas de transcripción profunda.
-   Cada descarte conserva score y motivo.
-   Los videos sin transcripción no bloquean el procesamiento de otros
    videos.

### 12.2 Extracción

-   Cada estrategia u operación incluye `video_id` y timestamp cuando la
    evidencia existe.
-   Los datos ausentes permanecen `NULL` y se listan en
    `unknown_fields`.
-   La IA distingue reglas explícitas de inferencias.
-   Las extracciones cumplen JSON Schema y pasan validaciones.
-   Un revisor puede corregir y auditar una extracción.
-   La misma entrada y versión de prompt/modelo permiten rastrear el
    resultado generado.

### 12.3 Strategy Intelligence

-   Un backtest es reproducible con dataset, parámetros, costes y
    versión de estrategia registrados.
-   Se evita look-ahead bias y leakage entre entrenamiento y prueba.
-   Se contemplan bid/ask, spread, comisiones y slippage cuando el
    dataset lo permite.
-   Los resultados se desglosan por activo, régimen, horario y período.
-   No se aprueba una estrategia solo por win rate o por una muestra
    pequeña.
-   Las estrategias aprobadas conservan una versión inmutable.

### 12.4 Integración

-   El robot solo consulta estrategias autorizadas.
-   La API rechaza solicitudes no autenticadas o malformadas.
-   ETI no puede enviar órdenes al broker en el MVP.
-   Si ETI está caído, el robot no genera una señal de sustitución.
-   Todas las recomendaciones son auditables.

------------------------------------------------------------------------

## 13. Riesgos, dependencias y decisiones pendientes

  -----------------------------------------------------------------------
  Riesgo / decisión                   Tratamiento
  ----------------------------------- -----------------------------------
  Acceso a transcripciones            Validar disponibilidad y mecanismo
                                      permitido; no asumir acceso
                                      universal.

  Cuotas de YouTube                   Paginación, caché, sincronización
                                      incremental y gestión de cuota.

  Coste de IA                         Clasificación escalonada, límites y
                                      medición por video.

  Datos históricos de opciones        Evaluar proveedor, licencias,
                                      profundidad, contratos vencidos y
                                      costes.

  Broker de opciones                  Seleccionar por separado; no asumir
                                      compatibilidad de cTrader.

  Afirmaciones de traders             Etiquetar tipo de evidencia y
                                      evitar atribuir verificación sin
                                      soporte.

  Sobreajuste                         Out-of-sample, walk-forward,
                                      pruebas robustas y criterios
                                      previos.

  Cambios de mercado                  Monitoreo continuo,
                                      caducidad/revisión de estrategias y
                                      suspensión.

  Seguridad del robot                 API read-only y controles de riesgo
                                      independientes.
  -----------------------------------------------------------------------

### Decisiones que deben cerrarse durante las fases

1.  Qué proveedor de datos de opciones se utilizará y con qué
    plan/licencia.
2.  Qué mecanismo autorizado se utilizará para transcripciones de
    YouTube.
3.  Qué modelo(s) de IA se utilizarán y cuál es el presupuesto mensual.
4.  Qué activos y vencimientos forman parte del primer MVP (por ejemplo
    SPY/QQQ/SPX, 0DTE o expiraciones posteriores).
5.  Qué broker/API soportará la futura ejecución de opciones.
6.  Qué métricas y umbrales previos determinan la aprobación de una
    estrategia.

------------------------------------------------------------------------

## 14. Prompt maestro para Antigravity

Copiar este prompt como primera tarea después de abrir el repositorio
eTrade en Antigravity.

``` text
PROYECTO: eTrade Trading Intelligence (ETI)

OBJETIVO
Construir un módulo integrado en eTrade que descubra contenido de trading en canales de YouTube, filtre videos relevantes, procese transcripciones únicamente mediante mecanismos autorizados, extraiga estrategias y operaciones, almacene conocimiento estructurado y permita que el robot consulte estrategias que hayan sido validadas.

STACK EXISTENTE
Python, Node.js, Supabase/PostgreSQL y Next.js/Vercel. Inspecciona el stack real antes de proponer cambios. No reemplaces tecnologías existentes sin justificación y aprobación.

REGLAS OBLIGATORIAS
1. Primero audita el repositorio. No programes el módulo completo en la primera tarea.
2. Documenta arquitectura, dependencias, autenticación, base de datos, RLS, despliegue, scheduler y workers existentes.
3. Diseña ETI como módulo desacoplado del motor de ejecución.
4. Implementa un Smart Content Filtering Engine: primero analiza metadatos; solo solicita análisis profundo/transcripción para videos relevantes.
5. Un canal puede tener miles de videos. Implementa paginación, sincronización incremental, deduplicación, cuotas, reintentos e idempotencia.
6. No asumas que YouTube Data API proporciona cualquier transcripción. Utiliza solo mecanismos permitidos y registra estados de disponibilidad.
7. No almacenes transcripciones completas por defecto. Guarda metadatos, URL, timestamps, resúmenes y conocimiento estructurado permitido.
8. Extrae estrategias, reglas, operaciones, indicadores, condiciones de mercado, resultados declarados y evidencias.
9. Distingue EXPLICIT_RULE, INFERRED_RULE, LIVE_CLAIM, RECAP_CLAIM, HISTORICAL_BACKTEST, BROKER_VERIFIED y UNVERIFIED_CLAIM.
10. Nunca inventes campos faltantes: utiliza NULL y unknown_fields.
11. Cada afirmación extraída debe conservar trazabilidad al canal, video y segmento temporal.
12. Versiona prompts, modelos, esquemas y estrategias.
13. Backtesting de opciones requiere datos de contratos, bid/ask, liquidez, IV/Greeks cuando estén disponibles, costes, spread y slippage. No simules rentabilidad de opciones usando solo precios del subyacente.
14. No habilites ejecución automática. La API será read-only durante el MVP.
15. La IA no controla el riesgo ni autoriza órdenes. El robot debe aplicar reglas determinísticas independientes.
16. Aplica autenticación, autorización, RLS, auditoría, rate limits, logs y gestión segura de secretos.
17. Construye por fases y no avances sin pruebas y aprobación del entregable anterior.

COMPONENTES
- Knowledge Sources
- YouTube Metadata Collector
- Smart Content Filtering Engine
- Transcript Access & Segmentation
- AI Knowledge Extractor
- Trading Knowledge Base (tablas eti_*)
- Human Review & Evidence Scoring
- Strategy Intelligence / Backtesting
- Validated Strategy Repository
- Decision Intelligence API
- ETI Administration Dashboard

FASES
Fase 0: auditoría del eTrade actual y arquitectura de integración.
Fase 1: migraciones, seguridad, tablas e interfaz base.
Fase 2: colector YouTube y filtro inteligente.
Fase 3: transcripciones permitidas, segmentación y extracción IA.
Fase 4: estrategia normalizada, datos históricos y backtesting.
Fase 5: API read-only e integración con el robot.
Fase 6: paper trading, monitoreo y piloto.

PRIMER ENTREGABLE — SOLO FASE 0
Inspecciona el repositorio y entrega:
A. Arquitectura existente y diagrama.
B. Módulos reutilizables.
C. Esquema Supabase y políticas de seguridad relevantes.
D. Propuesta de integración ETI adaptada al repositorio.
E. Modelo inicial de datos y relaciones.
F. Propuesta de colas/workers y scheduler.
G. Riesgos, dependencias externas y estimación revisada.
H. Plan de pruebas y criterios de aceptación.

No realices cambios funcionales ni migraciones todavía. Espera aprobación explícita para iniciar la Fase 1.
```

------------------------------------------------------------------------

## 15. Recomendación final

Iniciar con la Fase 0 y aprobar el diseño antes de tocar el código. El
componente diferenciador de ETI será el filtrado inteligente: poder
explorar un canal de 1.000 videos, analizar profundamente solo los
candidatos relevantes y guardar en la base únicamente conocimiento
estructurado y trazable.

La primera versión debe demostrar el ciclo completo de conocimiento
---desde el canal hasta la consulta por el robot--- sin ejecutar
operaciones. Solo después de disponer de datos históricos de opciones
adecuados y de una validación prospectiva suficiente se debe considerar
cualquier autorización operativa.

ETI debe aprender de varias fuentes y también del comportamiento medido
del propio robot. Con el tiempo, la ventaja no será acumular videos,
sino identificar qué reglas funcionan, bajo qué condiciones, con qué
evidencia y con qué límites de riesgo.
