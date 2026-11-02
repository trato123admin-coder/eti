# ETI-S0: Informe de Auditoría de Arquitectura, Spikes D & E y Preparación del Entorno

**Versión:** 1.0  
**Fecha:** 31 de octubre de 2026  
**Sprint:** ETI-S0 (Fase 0 - Auditoría y Viabilidad)  
**Estado:** COMPLETADO CON ÉXITO  

---

## 1. Resumen Ejecutivo de la Auditoría

En cumplimiento con el mandato obligatorio de la Fase 0 (§11.1 de la arquitectura y Addendum v2.1 §7), se ha ejecutado la auditoría integral del ecosistema, dependencias, base de datos y puntos de integración con el robot de trading `eTrade`.

### Resultados Clave
1. **Entorno de Ejecución:**
   * Node.js: `v22.19.0`
   * npm: `10.9.3`
   * Python: `3.10.5`
2. **Base de Datos Operativa (Supabase):**
   * Endpoint verificado: `https://cuyixoedyjabyltkjkej.supabase.co`
   * Credenciales: Anon Key y Service Role Key validadas con respuesta HTTP 200 OK vía REST API.
   * Estado: Instancia limpia, lista para recibir las migraciones de plataforma (`app_*`) y del módulo ETI (`eti_*`).
3. **Módulo de Opciones de eTrade (`C:\Fuentes\eTrade\backend\app\options`):**
   * Se auditó el código de producción del robot de opciones, identificando con precisión:
     * El motor de reglas **ADUANA (O-1 a O-12)** en `options_aduana.py`.
     * El motor de scoring **APEX Options (6 componentes)** en `score.py`.
     * El motor de simulación de órdenes y fills conservadores en `paper_execution.py`.
     * Las estructuras de datos de `opt_candidates`, `opt_aduana_decisions` y `opt_positions`.

---

## 2. Spike D: Mapeo de Fuentes del Experience Ledger (Vía C)

El **Experience Ledger** requiere registrar de forma asíncrona e inmutable cada decisión, candidato y ejecución que ocurra en el módulo de Opciones de eTrade, **sin introducir latencia ni dependencias bloqueantes** en la ruta crítica del trading.

### 2.1 Mapeo de Entidades y Datos de Opciones

| Dominio | Fuente en eTrade (`app/options/`) | Campos Capturados para el Ledger ETI (`eti_experience_*`) |
|:---|:---|:---|
| **Identificación** | `candidates.py` / `settings_defaults.py` | `execution_mode` (`PAPER`/`LIVE`), `underlying_symbol` (SPY, QQQ, SPX), `strategy_type` (`outright_call`, `outright_put`, `credit_spread`, etc.), `config_hash`. |
| **Decisión & Scoring** | `score.py` (Modelo `v1.0-s5`) | **Score APEX Total** (0-100) y sus 6 componentes desglosados: <br>1. *EV / Edge neto*<br>2. *Coherencia direccional* (APEX / Catalizador / Gap Runner)<br>3. *Liquidez y Spread* (min OI, max rel spread)<br>4. *Riesgo y Escenarios Adversos* (drawdown adverso, sobrecoste)<br>5. *IV & Griegas* (IV media, Delta sweet spot 0.40-0.60)<br>6. *Contexto & Catalizadores* (Eventos binarios dentro de DTE). |
| **Filtro ADUANA** | `options_aduana.py` | Resultado booleano y detalle de las **12 reglas O-1 a O-12**:<br>• `O-1`: Modo paper<br>• `O-2`: Riesgo definido (cobertura)<br>• `O-3`: Techo máx loss por trade ($1500 megacap / $1000 base)<br>• `O-4`: Riesgo abierto agregado<br>• `O-5`: Stop diario acumulado<br>• `O-6`: Spread relativo de pierna y sobrecoste de ejecución<br>• `O-7`: Calidad de datos (frescura quote age, LIVE vs DELAYED)<br>• `O-8`: Ventana de mercado (9:40-15:45 EST)<br>• `O-9`: Eventos binarios (earnings)<br>• `O-10`: Idempotencia de candidata<br>• `O-11`: Máximo 1 pos/subyacente y límites direccionales<br>• `O-12`: Gate de catalizador (Gap&Go, mecha SIPV $\ge 40\%$, pendiente EMA3 1h). |
| **Instantánea de Mercado** | `quotes_by_contract` | Bid/Ask en el microsegundo de la decisión, Greeks (Delta, Gamma, Theta, Vega), Implied Volatility (IV), Spread observado. |
| **Ejecución Realizada** | `paper_execution.py` (`v1.0-s6`) | Fills por pierna, precio mid de referencia vs. fill real $\to$ **Slippage realizado**, comisiones ($0.65 + $0.05 / contrato), fill model. |
| **Resultado Financiero** | `exit_engine.py` | P&L neto realizado, MFE (Maximum Favorable Excursion), MAE (Maximum Adverse Excursion), motivo de salida (Take Profit activo vs. Stop Loss pasivo), duración en minutos. |
| **Candidatos Rechazados** | `aduana_decisions` rechazadas | **Todos los candidatos que fallaron alguna regla O-1..O-12**, con su contexto completo. *Propósito:* Análisis contrafactual para medir si ADUANA evitó pérdidas o filtró operaciones ganadoras (evita sesgo de supervivencia). |

### 2.2 Arquitectura del Ledger y Reglas de Integridad
1. **Append-Only Estricto:** Se implementará un trigger PostgreSQL en Supabase que lanza una excepción ante cualquier intento de `UPDATE` o `DELETE` sobre las tablas `eti_experience_*`.
2. **Desacoplamiento Absoluto:** La captura no se realiza mediante llamadas síncronas en el bucle de trading. Se utilizará un conector de lectura asíncrona periódica idempotente (polling cada 3-5 segundos sobre las tablas de eTrade o cola de eventos en memoria sin bloqueo).
3. **Doble Libro:**
   * `EXECUTED`: Operaciones reales cursadas por el robot (PAPER o LIVE), sujetas al tope de 3 trades/día.
   * `SHADOW_SIGNALS`: Señales teóricas que ETI hubiese disparado sin topes de capital diario, simuladas con fills pesimistas para acelerar la acumulación de muestra estadística (E3).

---

## 3. Spike E: Viabilidad del Replay de Operaciones Declaradas (Vía A)

El objetivo de la Vía A es auditar las operaciones de opciones relatadas en video por los 5 YouTubers para contrastar su plausibilidad histórica y calcular la credibilidad del autor (`eti_source_credibility`).

### 3.1 Normalización del Trade Declarado (`eti_operations`)
Cada operación extraída de los videos se somete a la siguiente estructura canónica:
```json
{
  "source_id": "yt_trader_01",
  "video_id": "dQw4w9WgXcQ",
  "timestamp_seconds": 542,
  "market_date": "2026-09-15",
  "entry_time_est": "09:47:00",
  "underlying": "SPY",
  "contract_type": "CALL",
  "strike": 560.0,
  "expiration_dte": 0,
  "declared_entry_premium": 1.45,
  "declared_exit_premium": 2.10,
  "declared_pnl_usd": 650.0,
  "declared_quantity": 10,
  "date_confidence": "HIGH"
}
```
*Regla de No Invención:* Si el autor no menciona el strike o la prima exacta, el campo permanece en `NULL` y se marca en `unknown_fields`.

### 3.2 Protocolo de Replay contra Datos Históricos D2 (ThetaData / ORATS)
1. **Verificación de Existencia de Contrato:** Comprobar si el contrato `SPY260915C00560000` existió y tuvo cotizaciones en esa fecha.
2. **Contraste de Rango de Precios:**
   $$\text{Bid}_{t} \le \text{Precio Declarado} \le \text{Ask}_{t} \pm \epsilon$$
   Si la prima declarada está dentro del spread observado $\to$ plausible. Si la compra declarada se hizo por debajo del bid del mercado $\to$ físicamente imposible.
3. **Reconstrucción Pesimista de P&L:**
   * Entrada: Compra al Ask registrado en el minuto del trade + slippage conservador.
   * Salida: Venta al Bid registrado en el minuto de salida - slippage.
   * Descuento de comisiones ($0.65/contrato).
4. **Clasificación del Resultado:**
   * `REPLAY_CONSISTENT`: Precios dentro del spread y P&L compatible con margen de tolerancia ($\le 15\%$).
   * `REPLAY_PARTIAL`: Precios posibles pero P&L sobreestimado (ej. autor asume venta en el tick más alto del día sin spread).
   * `REPLAY_INCONSISTENT`: Precios fuera de mercado, contrato inexistente o P&L falso.
   * `NOT_VERIFIABLE`: Datos ausentes o timestamp impreciso (nunca se muestra como falso, se cataloga como no verificable).
5. **Métrica Claim-to-Rule Gap:** Comparar el rendimiento de los trades seleccionados que el YouTuber mostró en video versus el resultado de ejecutar su regla de forma sistemática en todo el histórico (Vía B). Si el YouTuber muestra 80% win rate pero la regla da 38% en todo el año, el gap evidencia sesgo de selección severo.

---

## 4. Auditoría de Autenticación de Plataforma (Hacia PLT-A1)

### 4.1 Diagnóstico
* La base de datos en Supabase (`cuyixoedyjabyltkjkej.supabase.co`) cuenta con el motor nativo de **Supabase Auth** habilitado en el esquema `auth.users`.
* Actualmente no existen políticas restrictivas ni tablas de roles creadas en el esquema público, lo que permite un despliegue limpio de **PLT-A1** sin riesgo de romper sesiones activas.

### 4.2 Arquitectura de Acceso Definida para PLT-A1
1. **Gestión de Identidad:** Supabase Auth con confirmación de email y contraseñas de al menos 12 caracteres.
2. **Registro por Invitación:** Flujo cerrado donde un administrador genera un token de invitación (`app_invitations`). No hay auto-registro abierto.
3. **MFA Obligatorio:** TOTP obligatorio para `owner` y `admin`.
4. **Roles RBAC:**
   * `owner`: Acceso total, modificación de políticas y autorización de ejecución real.
   * `admin`: Gestión de usuarios, configuración y auditoría.
   * `trader`: Monitoreo y operación de eTrade.
   * `reviewer`: Auditoría de videos, extracción IA y revisión de reglas.
   * `viewer`: Visualización de dashboards y métricas (solo lectura).
   * `service`: Credencial de máquina con scopes específicos para el robot eTrade y workers.
5. **Garantía para el Robot:** El robot utilizará tokens criptográficos emitidos en `app_service_tokens` y validados vía middleware en Fastify, sin depender de cookies de navegador.

---

## 5. Estructura de Directorios del Proyecto ETI

Se establece la siguiente estructura de repositorio en `C:\Fuentes\ETI`:

```
C:\Fuentes\ETI\
├── .env.local                    # Configuración de entornos y secretos
├── docs/                         # Documentación de arquitectura y planes
│   ├── eTrade_ETI_Addendum_v2_1_Validacion_y_Acceso_claude.md
│   ├── eTrade_Trading_Intelligence_Arquitectura_Antigravity_gtp.md
│   ├── ETI_Plan_Maestro_Sprints_Construccion.md
│   └── ETI_S0_Informe_Auditoria_y_Spikes.md
├── database/                     # Migraciones versionadas en PostgreSQL
│   └── migrations/
│       ├── 001_plt_access_and_auth.sql       # Tablas app_* de PLT-A1
│       ├── 002_eti_core_schema.sql           # Tablas eti_* de ETI-S1
│       └── 003_eti_experience_ledger.sql     # Tablas Vía C de ETI-S1B
├── backend/
│   ├── engine/                   # Fastify Node.js API (Puerto 3001)
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── config.ts
│   │   │   ├── plugins/          # Supabase client, auth middleware, cors
│   │   │   └── routes/           # Endpoints eti y app
│   │   └── tsconfig.json
│   └── python/                   # Workers y pipelines analíticos
│       ├── requirements.txt
│       ├── collectors/           # Ingesta YouTube (S2)
│       ├── transcripts/          # Segmentación semántica (S3)
│       ├── extractors/           # LLM extraction & rule consensus (S4)
│       ├── backtesting/          # Motor Vía B y Replay Vía A (S6/S6B)
│       └── ledger_sync/          # Conector asíncrono eTrade (S1B)
└── frontend/                     # Dashboard Next.js (Puerto 3000)
    ├── package.json
    ├── src/
    │   ├── app/                  # App Router
    │   ├── components/           # UI components
    │   └── lib/                  # Supabase browser client
    └── tsconfig.json
```

---

## 6. Dictamen de Avance y Conclusión de ETI-S0

* ✅ **Auditoría del entorno y conectividad:** 100% superada.
* ✅ **Spike D (Fuentes del Ledger en Opciones):** 100% mapeado con el motor de eTrade (`options_aduana.py`, `score.py`, `paper_execution.py`).
* ✅ **Spike E (Viabilidad de Replay de Claims):** Protocolo Vía A formalizado con reglas matemáticas de consistencia.
* ✅ **Plan de mitigación de no regresión:** Verificado; el robot no se ve afectado.

**Veredicto:** El Sprint **ETI-S0** se declara **COMPLETADO SATISFACTORIAMENTE**.  
Se autoriza el paso al Sprint **PLT-A1: Acceso, Autenticación y Seguridad a Nivel Plataforma** y al despliegue de las migraciones base.
