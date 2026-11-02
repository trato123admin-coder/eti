# eTrade Trading Intelligence (ETI) — Addendum v2.1

## Dos vías de validación con operaciones reales + modelo de acceso de usuarios

**Versión:** 2.1 (addendum a `eTrade_ETI_Arquitectura_Final_v2.md`)
**Fecha:** 31 de octubre de 2026
**Alcance:** extiende y, donde se indica, **reemplaza** secciones de la v2.0. Lo no mencionado aquí permanece igual.

| Sección v2.0 afectada | Efecto |
|-----------------------|--------|
| §2 Principios (4) | Se matiza: las afirmaciones de terceros siguen pesando cero en la validación, pero ahora se **auditan** (Vía A) y se contrastan con experiencia propia (Vía B). |
| §3.2 Decisiones abiertas | Se añaden D9–D12 (§8 de este addendum). |
| §8 Modelo de datos | Se añaden tablas de replay, ledger de experiencia y acceso (§5 y §6). |
| §9 Validación | Se reemplaza el esquema de evidencia por la **jerarquía E0–E6** (§1.2). |
| §10 Integración | `eti_robot_queries` se enlaza con el ledger de experiencia. |
| §13 Sprints | Se añaden PLT-A1, ETI-S1B y ETI-S6B; se modifican S0, S1, S7, S9 (§7). |
| §16 Prompt maestro | Se añaden reglas 16–23 (§10). |

---

## 1. Marco de evidencia: tres vías, un solo criterio de aprobación

Se piden dos tipos de validación. Para que no se mezclen evidencias de naturaleza distinta, conviene separarlas en **tres vías**, porque lo que el influencer dice haber operado, lo que una regla habría hecho en el histórico y lo que eTrade hace de verdad son preguntas diferentes:

| Vía | Pregunta que responde | Naturaleza |
|-----|----------------------|------------|
| **A. Replay de operaciones declaradas** (tu punto 1) | «¿Es *plausible* que esta operación que el influencer dice haber hecho con dinero real fuera ejecutable al precio y hora indicados? ¿Cuánto habría dado con fills pesimistas?» | Auditoría de afirmaciones. **No prueba** que ocurriera ni que sea rentable en conjunto. |
| **B. Backtest de reglas** (v2.0 §9) | «Si aplico la regla del autor a *todo* el histórico, no solo a los días que mostró, ¿gana tras costes y fuera de muestra?» | Evidencia histórica. |
| **C. Experience Ledger** (tu punto 2) | «¿Qué hizo realmente eTrade, en qué contexto, con qué resultado y con qué ejecución?» | Evidencia **prospectiva** (forward), la de mayor valor estadístico. |

Nota de terminología: las operaciones que eTrade realice en el futuro no son un *backtest* en sentido estricto, son evidencia *forward*. Sí **alimentan** los backtests: calibran los costes y permiten *replays* con el contexto exacto guardado en cada decisión.

### 1.1 Por qué las afirmaciones de terceros siguen sin pesar en la validación

Aunque el influencer opere con dinero real, sus operaciones mostradas están sujetas a sesgo de selección (se muestran ganadoras, se omiten perdedoras o cuentas), no se conoce el tamaño de cuenta ni el conjunto total de operaciones, y el relato suele ser posterior al hecho. Por eso la Vía A **prioriza y puntúa credibilidad de fuente**, pero no aprueba estrategias. La excepción es `BROKER_VERIFIED`: extractos completos y contextualizados revisados por un humano (puedes aportarlos por la vía V2: capturas o extractos subidos por ti).

### 1.2 Jerarquía de evidencia (reemplaza el esquema de evidencia de §9 en v2.0)

| Nivel | Evidencia | Peso en validación |
|-------|-----------|--------------------|
| E0 | Afirmación sin verificar (`LIVE_CLAIM`, `RECAP_CLAIM`, `UNVERIFIED_CLAIM`) | 0 — solo prioriza |
| E1 | Afirmación reproducida y consistente con datos históricos (Vía A) | 0 en aprobación; sube prioridad y credibilidad de la fuente |
| E2 | Backtest de reglas fuera de muestra con política sellada (Vía B) | Requisito necesario |
| E3 | **Señales ETI en sombra** (forward, simuladas, sin el tope de 3 ops/día) | Requisito de paper |
| E4 | Ejecución eTrade en **PAPER** registrada en el ledger | Evidencia forward |
| E5 | Ejecución eTrade **LIVE** registrada en el ledger (cuando exista) | Máxima evidencia propia |
| E6 | `BROKER_VERIFIED` de terceros tras revisión humana | Contextual; no sustituye E2–E5 |

**Regla de aprobación v2.1:** una estrategia solo llega a `VALIDATED` con **E2 superado + evidencia forward (E3 y/o E4/E5) que cumpla la política sellada**. Una sola vía nunca basta.

---

## 2. Vía A — Replay de operaciones declaradas (influencers)

### 2.1 Qué hace

Toma cada operación extraída (`eti_operations`) y la reconstruye contra datos históricos de opciones (proveedor D2):

1. **Normalizar la operación:** subyacente, dirección, contrato (strike/vencimiento) si se menciona, hora de entrada/salida, precios, tamaño y P&L declarado. Lo no dicho queda `NULL`.
2. **Fijar la fecha y hora de mercado:** se deduce de la fecha del video/directo, capítulos y referencias del autor; zona America/New_York. Si la fecha es incierta → `date_confidence` bajo y la operación puede quedar `NOT_VERIFIABLE`.
3. **Resolver el contrato:** comprobar que existía y era negociable en ese momento.
4. **Contrastar precios:** ¿el precio declarado cae dentro del bid/ask observado (con tolerancia configurable)? ¿había liquidez?
5. **Reconstruir el P&L** con fills pesimistas (compra al ask, venta al bid, comisiones) y compararlo con el declarado.

### 2.2 Resultado por operación

| Clase | Significado |
|-------|-------------|
| `REPLAY_CONSISTENT` | Contrato y precios plausibles; P&L reconstruido compatible con el declarado. |
| `REPLAY_PARTIAL` | Plausible, pero el P&L difiere de forma material (p. ej. depende de un fill optimista). |
| `REPLAY_INCONSISTENT` | Contrato inexistente, precio fuera del rango observable o P&L imposible con datos reales. |
| `NOT_VERIFIABLE` | Faltan campos o no hay cobertura de datos. **No se interpreta como falso.** |

### 2.3 Agregados por fuente (informativos)

- % de operaciones verificables y % consistentes.
- **P&L declarado vs P&L reconstruido** (¿sobreestima?).
- **Brecha operación-mostrada vs regla-completa (claim-to-rule gap):** al aplicar las reglas explícitas del autor a *todos* los días (Vía B), ¿el resultado se parece al de las operaciones que mostró? Una gran brecha sugiere selección de los mejores casos.
- Estos indicadores alimentan el **ranking de credibilidad de la fuente** y la prioridad de la cola de estrategias. **No** alimentan la aprobación.

### 2.4 Límites que deben declararse en la UI

- «Consistente» significa *plausible con datos*, no «ocurrió» ni «es rentable en conjunto».
- Mucho del contenido enseña resultados en pantalla (capturas, plataformas) que un texto no recoge. Procesar fotogramas de video no forma parte del alcance por defecto (ver §6 de v2.0); solo se OCR-ean **capturas o extractos que tú subas** (V2).

---

## 3. Vía C — Experience Ledger (operaciones propias de eTrade)

### 3.1 Objetivo

Registrar de forma inmutable cada decisión y operación de eTrade como **experiencia real con resultado real**, junto con el contexto que la originó, para: validar hacia adelante, calibrar costes, medir el aporte de ETI y generar hipótesis.

### 3.2 Qué se registra (por candidato y por operación)

| Bloque | Contenido |
|--------|-----------|
| Identificación | `execution_mode` (`PAPER` / `LIVE`), mercado, subyacente, estructura, estrategia/familia, versión de configuración (hash de Settings) |
| Decisión | Score APEX Options y sus 6 componentes, resultado de **cada regla de ADUANA (O-1…O-12)** y motivo, hora, régimen, estado de RADAR |
| Mercado en el instante | Cotizaciones bid/ask, IV y Greeks del contrato, liquidez |
| ETI | Respuesta de ETI (si la hubo): estrategias compatibles, versión, flags de contexto (`eti_robot_queries`) |
| Ejecución | Órdenes, fills, precio de referencia (mid/ask) vs fill → **slippage realizado**, comisiones, **modelo de fill usado** |
| Resultado | P&L neto, MFE/MAE, motivo y hora de salida, duración |
| **Rechazados** | Candidatos rechazados por ADUANA, con su contexto, para análisis contrafactual (evita sesgo de supervivencia) |

### 3.3 Reglas de integridad

- **Solo lectura sobre las tablas de trading** y **append-only** en el ledger; las correcciones son filas nuevas que referencian la anterior.
- **No añadir latencia ni dependencias a la ruta de ejecución:** la captura es asíncrona (sincronización periódica idempotente; un hook por eventos solo si la auditoría de S0 lo recomienda y con aprobación).
- **`PAPER` y `LIVE` nunca se mezclan en estadísticas.** Importante: mientras el módulo de Opciones opere solo en simulación, «resultado real» significa **resultado de paper trading con el modelo de fill del simulador**. Tiene valor, pero menos que ejecución real; el modelo de fill se guarda con cada fila.
- Diseño genérico por mercado (`market`) para que Crypto/Forex/Stocks puedan integrarse después; el primer alcance activo es **Opciones**.

### 3.4 Dos libros distintos para no engañarse con el tamaño de muestra

Con un máximo de 3 operaciones al día, el volumen ejecutado ronda **~60 operaciones al mes en total** (3 × ~21 sesiones), repartidas entre todas las estrategias. Reunir 150 operaciones forward por estrategia tardaría mucho. Por eso:

| Libro | Contenido | Nivel |
|-------|-----------|-------|
| `EXECUTED` | Lo que eTrade realmente ejecutó (PAPER/LIVE), sujeto a topes y ADUANA | E4 / E5 |
| `SHADOW_SIGNALS` | Señales que ETI habría emitido para cada estrategia, simuladas con fills pesimistas y **sin** el tope de 3/día | E3 |

Los dos se etiquetan y se reportan por separado. `SHADOW_SIGNALS` acelera la muestra, pero no sustituye la ejecución.

### 3.5 Usos del ledger (de menor a mayor riesgo)

1. **Validación forward** de estrategias ETI (E3/E4/E5) según la política sellada.
2. **Calibración del modelo de costes:** el slippage y los spreads *realizados* actualizan los supuestos del backtest (se versionan; cada backtest registra qué calibración usó).
3. **Análisis contrafactual de ADUANA:** ¿qué habría pasado con los candidatos rechazados por cada regla? Informa, no cambia nada solo.
4. **Atribución de ETI:** resultados con contexto ETI compatible vs. sin él, por régimen y familia, con intervalos de confianza y avisos de muestra insuficiente.
5. **Generación de hipótesis** hacia la Review Queue (`DISCOVERED`, origen `INTERNAL`).

### 3.6 Barreras de seguridad (el ledger aprende, no se autoajusta)

- **Sin auto-tuning** de parámetros de producción. Toda propuesta de cambio pasa por: hipótesis → evaluación pre-registrada → aprobación explícita del usuario.
- Mínimos de muestra antes de mostrar conclusiones; por debajo se rotula «insuficiente».
- Aviso por no estacionariedad: los resultados se presentan por periodo y régimen, no como un único número histórico.
- Cada conclusión enlaza a las operaciones que la sustentan.

---

## 4. Cómo se conectan las tres vías

```text
 Videos ─► Extracción ─► Operaciones declaradas ──► Vía A: Replay ──► credibilidad de fuente / prioridad
                │                                                              │
                └─► Reglas ─► DSL ─► Vía B: Backtest (E2) ─────────────────────┤
                                                                               ▼
                                  ETI Decision Service ──► eTrade (APEX/ADUANA) ──► Ejecución
                                          │                                     │
                                          └──────────────► Vía C: Ledger ◄──────┘
                                                              │
              calibración de costes ◄─────────────────────────┤
              validación forward (E3/E4/E5) ──────────────────┤
              hipótesis internas ──► Review Queue             ▼
                                                      Política de validación (VALIDATED / SUSPENDED)
```

---

## 5. Modelo de datos nuevo (Vías A y C)

**Vía A:** `eti_claim_replays` (una por operación declarada: clase, `date_confidence`, tolerancias usadas, dataset), `eti_claim_replay_quotes` (cotizaciones usadas), `eti_source_credibility` (agregados por fuente y periodo).
**Vía C:** `eti_experience_candidates` (decisión + contexto + reglas ADUANA, incluye rechazados), `eti_experience_trades` (ejecución y resultado), `eti_experience_snapshots` (mercado/Greeks/RADAR en el instante), `eti_shadow_signals`, `eti_cost_calibrations` (versionadas), `eti_attribution_reports`, `eti_counterfactuals`.
**Comunes:** `eti_evidence_level` (E0–E6) vinculado a `eti_evidence`; `execution_mode` y `fill_model` como columnas obligatorias en el ledger.

Reglas: UUID, UTC (+ hora de mercado), `NUMERIC` para importes, RLS por rol, ledger **append-only** (trigger que bloquea `UPDATE/DELETE`), auditoría de lecturas administrativas.

---

## 6. Modelo de acceso de usuarios (nivel plataforma)

Esto afecta a **todo eTrade**, no solo a ETI, por lo que se trata como un Sprint de plataforma (PLT-A1) con protección explícita contra regresiones en trading.

### 6.1 Decisiones de diseño (con recomendación)

| Tema | Recomendación |
|------|---------------|
| Proveedor | **Supabase Auth** (ya en el stack): email + contraseña, verificación de correo, recuperación de contraseña, rotación de refresh tokens. |
| Registro | **Por invitación y con aprobación del administrador.** Sin alta abierta: la plataforma controla sistemas de trading, claves y datos. Opcional: formulario «solicitar acceso» que crea un perfil `PENDING` hasta aprobación. |
| MFA | TOTP **obligatorio** para `owner`/`admin`; recomendado para el resto. |
| Roles (RBAC) | `owner`, `admin`, `trader` (operador), `reviewer` (ETI), `viewer` (solo lectura), `service` (máquina). |
| Modelo de tenant | **Una sola organización** (equipo con roles). Ver D9: si habrá terceros con cuentas de broker propias, el diseño cambia. |
| Servicios internos | Robot y workers usan **tokens/claves de servicio** con scopes, rotación y caducidad; la `service_role` de Supabase **nunca** llega al navegador. |

### 6.2 Funcionalidad

- **Pantallas:** iniciar sesión, solicitar acceso, aceptar invitación, olvidé contraseña/restablecer, alta de MFA, perfil, gestión de usuarios (invitar, aprobar, cambiar rol, suspender), sesiones activas y cierre global.
- **Backend (FastAPI):** dependencia que valida el JWT de Supabase, resuelve rol y aplica autorización por endpoint (`require_role(...)`). El front oculta lo no permitido, **el backend lo impone**.
- **Datos (RLS):** políticas por rol sobre todas las tablas `eti_*` y las tablas nuevas de acceso; `eti_service` solo lectura de vistas autorizadas.
- **Matriz de permisos** documentada (ejemplos): editar Settings de trading → `owner/admin`; cambiar `execution` o políticas de validación → solo `owner`; revisar extracciones → `reviewer`; ver dashboards → `viewer`.

### 6.3 Seguridad

- Contraseña mínima de 12 caracteres y verificación contra contraseñas filtradas si el proveedor lo permite.
- Rate limiting y retroceso/bloqueo temporal por intentos fallidos; mensajes de error genéricos (sin revelar si el correo existe).
- Cookies `httpOnly`, `Secure`, `SameSite`; CORS restringido; protección CSRF donde aplique.
- Tabla de auditoría de eventos de acceso (login, fallo, MFA, cambio de rol, invitación, suspensión).
- Invitaciones: token de un solo uso, hash en BD, caducidad corta.
- Rotación y revocación de claves de servicio; registro de último uso.

### 6.4 Tablas

`app_profiles` (estado `PENDING/ACTIVE/SUSPENDED/DISABLED`, idioma, zona horaria), `app_roles`, `app_user_roles`, `app_permissions` (matriz), `app_invitations`, `app_access_requests`, `app_auth_events`, `app_service_tokens` (hash, scopes, caducidad, último uso). Prefijo `app_` por ser de plataforma.

### 6.5 Riesgo principal y cómo se controla

El cambio toca endpoints y workers que **ya operan**. Controles obligatorios: auditoría previa del auth actual en S0; despliegue con **feature flag** y periodo de compatibilidad; suite de regresión sobre endpoints de trading; **ningún cambio en la lógica de trading**; plan de rollback; credenciales de servicio creadas y probadas **antes** de exigir autenticación de usuario.

---

## 7. Impacto en el plan de Sprints

### Cambios y nuevos Sprints

| Sprint | Cambio |
|--------|--------|
| **ETI-S0** (modificado) | Añade: **auditoría del auth actual**; **Spike D** (tablas y eventos del módulo de Opciones para el ledger); **Spike E** (viabilidad del replay con ~10 operaciones declaradas reales y una muestra de datos D2). |
| **PLT-A1** — Acceso y usuarios *(nuevo, 8–12 días, tras S0 y antes de S1)* | Todo el §6. **Aceptación:** invitación → alta → MFA → login probado; RLS por rol verificada; credenciales de servicio operativas; regresión de trading sin cambios; auditoría de eventos; usuario suspendido pierde acceso de inmediato. |
| **ETI-S1** (modificado) | Roles y RLS usan el modelo de PLT-A1. |
| **ETI-S1B** — Experience Ledger *(nuevo, 7–10 días; en paralelo a S2–S4)* | Tablas de Vía C, sincronización read-only e idempotente desde el módulo de Opciones, captura de **rechazados**, `execution_mode`/`fill_model`, libros `EXECUTED` y `SHADOW_SIGNALS` (el segundo puede quedar como esqueleto hasta S6), vista básica en UI. **Aceptación:** una operación paper aparece completa (decisión, reglas ADUANA, contexto, fill, resultado); reproceso idempotente sin duplicados; el ledger rechaza `UPDATE/DELETE`; **cero impacto en latencia** de ejecución; sin escrituras sobre tablas de trading. |
| **ETI-S6B** — Replay de operaciones declaradas *(nuevo, 7–10 días, tras S6)* | Vía A completa: normalización, resolución de contratos, contraste con bid/ask, P&L pesimista, clases de resultado, agregados por fuente, brecha operación-vs-regla, UI en Strategy Lab. **Aceptación:** reproducible (misma entrada → mismo resultado); `NOT_VERIFIABLE` nunca se muestra como falso; ninguna métrica de la Vía A entra en la aprobación. |
| **ETI-S7** (modificado) | Incorpora la jerarquía E0–E6 y la regla «E2 + evidencia forward». |
| **ETI-S8** (modificado) | `eti_robot_queries` se enlaza a `eti_experience_candidates`. |
| **ETI-S9** (modificado) | El paper trading usa el ledger (`EXECUTED` + `SHADOW_SIGNALS`); incluye calibración de costes y primer informe de atribución con avisos de muestra. |

### Orden resultante

`S0 → PLT-A1 → S1 → (S1B ∥ S2 → S3 → S4) → S5 → S6 → S6B → S7 → S8 → S9 → S10`

El ledger arranca temprano a propósito: **la evidencia forward solo se acumula con el tiempo**, así que cuanto antes empiece a registrar, antes habrá muestra.

### Estimación actualizada

Construcción total ≈ **18–22 semanas** (v2.0: 14–18), con parte en paralelo (el ledger corre junto a S2–S4), más 4–8 semanas de paper trading. Es una estimación mía a revisar tras S0.

---

## 8. Decisiones nuevas

| ID | Decisión | Recomendación |
|----|----------|---------------|
| D9 | **Modelo de usuarios:** equipo con roles sobre un sistema compartido, o terceros con sus propias cuentas de broker | Equipo con roles (una organización). Si habrá terceros: es otro proyecto (aislamiento por tenant, conexión de broker por usuario y revisión legal/regulatoria; no es asesoría legal), y conviene saberlo ya porque cambia el esquema. |
| D10 | Política de registro | Invitación + aprobación; MFA obligatorio para `owner`/`admin`. |
| D11 | Alcance inicial del ledger | Esquema genérico por mercado; ingesta activa solo de **Opciones** al inicio. |
| D12 | Si habrá ejecución **LIVE** de opciones y cuándo | Hasta entonces, rotular todo «PAPER» con su modelo de fill. Definir con qué tamaño y condiciones empezaría LIVE antes de S9. |

---

## 9. Criterios de aceptación transversales (adición a §14 de v2.0)

- Ninguna métrica de la Vía A (E0/E1) modifica el estado de una estrategia.
- Ningún dato `PAPER` se agrega con `LIVE`.
- Todo cambio de parámetros propuesto desde el ledger queda como hipótesis con aprobación explícita; no hay modificación automática de producción.
- Cada backtest registra la calibración de costes que usó.
- Toda pantalla y endpoint nuevos exigen autenticación y rol; prueba automática de acceso denegado por rol.
- La regresión de los módulos de trading existentes pasa sin cambios tras PLT-A1.

---

## 10. Adenda al prompt maestro para Antigravity (reglas 16–23)

```text
16. Validación en tres vías separadas: (A) replay de operaciones declaradas por terceros, (B) backtest de reglas con datos reales de opciones, (C) Experience Ledger con las operaciones de eTrade. Usa la jerarquía de evidencia E0–E6; una estrategia solo es VALIDATED con E2 superado más evidencia forward (E3 y/o E4/E5) según la política sellada.
17. Las métricas de la vía A (replay de afirmaciones) NUNCA aprueban estrategias; solo priorizan y puntúan credibilidad de la fuente. NOT_VERIFIABLE no equivale a falso. «Consistente» significa plausible con datos, no que ocurrió.
18. El Experience Ledger es append-only y de solo lectura sobre las tablas de trading: no escribas en ellas, no añadas latencia a la ruta de ejecución, captura también los candidatos rechazados por ADUANA y guarda execution_mode (PAPER/LIVE) y fill_model. Nunca mezcles PAPER con LIVE en estadísticas.
19. Mantén separados los libros EXECUTED y SHADOW_SIGNALS.
20. El ledger NO ajusta parámetros de producción automáticamente. Las mejoras salen como hipótesis → evaluación pre-registrada → aprobación explícita del usuario.
21. Calibra el modelo de costes del backtest con slippage y spreads realizados (versionado) y registra la calibración usada en cada backtest.
22. Acceso de usuarios (PLT-A1, nivel plataforma): Supabase Auth, registro por invitación con aprobación, MFA TOTP obligatorio para owner/admin, RBAC (owner, admin, trader, reviewer, viewer, service), RLS por rol, tokens de servicio con scopes y rotación, rate limiting, auditoría de eventos de acceso. El backend impone la autorización; el frontend solo la refleja.
23. PLT-A1 toca sistemas en producción: audita primero el auth actual, usa feature flag y periodo de compatibilidad, crea y prueba las credenciales de servicio del robot y los workers ANTES de exigir autenticación de usuario, ejecuta regresión sobre los endpoints de trading y no cambies lógica de trading.

ORDEN: S0 → PLT-A1 → S1 → (S1B en paralelo con S2–S4) → S5 → S6 → S6B → S7 → S8 → S9 → S10.
S0 incluye además: auditoría del auth actual, Spike D (fuentes de datos del ledger en el módulo de Opciones) y Spike E (viabilidad del replay de operaciones declaradas).
```
