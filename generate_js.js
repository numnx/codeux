const fs = require('fs');

const extracted = JSON.parse(fs.readFileSync('extracted.json', 'utf8'));

const translations = {
    "A direct read of prompt, cache, generation, and reasoning volume.": "Una lectura directa del volumen de solicitud, caché, generación y razonamiento.",
    "Across {count} provider call": "En {count} llamada de proveedor",
    "Across {count} provider calls": "En {count} llamadas de proveedor",
    "All counted invocations were reported directly.": "Todas las invocaciones contadas fueron reportadas directamente.",
    "All {calls} invocations are priced: {configured} from configured rates and {reported} from provider-reported cost.": "Todas las {calls} invocaciones tienen precio: {configured} a partir de tarifas configuradas y {reported} del costo reportado por el proveedor.",
    "All {calls} invocations have a valid pricing source and legitimately total $0.00 ({configured} configured, {reported} provider reported).": "Todas las {calls} invocaciones tienen una fuente de precios válida y legítimamente suman $0.00 ({configured} configuradas, {reported} reportadas por el proveedor).",
    "Chart minimap zoom region, full range of {count} bucket{count1}": "Región de zoom del minimapa del gráfico, rango completo de {count} intervalos{count1}",
    "Chart minimap zoom region, showing buckets {count} through {count1} of {count2}": "Región de zoom del minimapa del gráfico, mostrando intervalos {count} a {count1} de {count2}",
    "Choose a start and end date. Dates are interpreted as UTC calendar days.": "Elija una fecha de inicio y fin. Las fechas se interpretan como días del calendario UTC.",
    "Choose both dates before applying a custom range.": "Elija ambas fechas antes de aplicar un rango personalizado.",
    "Choose the analysis lens for the current telemetry window.": "Elija la lente de análisis para la ventana de telemetría actual.",
    "Combined filtered throughput across the current view.": "Rendimiento filtrado combinado en la vista actual.",
    "Complete cost coverage — all {count} calls have a usable cost source.": "Cobertura de costos completa: las {count} llamadas tienen una fuente de costo utilizable.",
    "Conceptual sprint reruns are combined before averaging": "Las repeticiones de sprint conceptuales se combinan antes de promediar",
    "Configured free usage — covered calls reconcile to $0.00 and are not unpriced.": "Uso gratuito configurado: las llamadas cubiertas se concilian a $0.00 y no están sin precio.",
    "Cost averages and a spend trend will appear after a provider invocation is recorded.": "Los promedios de costos y una tendencia de gasto aparecerán después de que se registre una invocación de proveedor.",
    "Coverage metadata is missing for {unknown} of {calls} invocations. Displayed dollar values cannot be treated as complete.": "Faltan metadatos de cobertura para {unknown} de {calls} invocaciones. Los valores en dólares mostrados no se pueden considerar completos.",
    "Covered zero-cost usage — covered calls reconcile to $0.00 and are not unpriced.": "Uso sin costo cubierto: las llamadas cubiertas se concilian a $0.00 y no están sin precio.",
    "Current sprint and task state stays separate from invocation metrics so active work, blocked work, and settled work can be scanned first.": "El estado actual del sprint y de la tarea se mantiene separado de las métricas de invocación para que el trabajo activo, bloqueado y resuelto se pueda escanear primero.",
    "Current volume, success rate, latency, cache efficiency, and in-flight work are derived from the server-projected summary for the current filter set.": "El volumen actual, la tasa de éxito, la latencia, la eficiencia de la caché y el trabajo en curso se derivan del resumen proyectado por el servidor para el conjunto de filtros actual.",
    "Deep operational ledgers for execution scopes, redesigned around search, recency, sort controls, and richer usage breakdowns. — {stats.range.label}": "Registros operativos profundos para alcances de ejecución, rediseñados en torno a búsquedas, actualidad, controles de ordenamiento y desgloses de uso más ricos. — {stats.range.label}",
    "Empty window — no calls or token usage were recorded.": "Ventana vacía: no se registraron llamadas ni uso de tokens.",
    "End date must be after start date.": "La fecha de fin debe ser posterior a la fecha de inicio.",
    "Error classes are grouped so operators can separate transient issues from provider, model, and cancellation problems at a glance.": "Las clases de error se agrupan para que los operadores puedan separar los problemas transitorios de los problemas del proveedor, del modelo y de cancelación de un vistazo.",
    "Estimated fallback": "Respaldo estimado",
    "Every invocation has configured or provider-reported pricing.": "Cada invocación tiene precios configurados o reportados por el proveedor.",
    "Execution purposes driving spend": "Propósitos de ejecución que impulsan el gasto",
    "Failed or cancelled invocations with classifiable details will appear here.": "Las invocaciones fallidas o canceladas con detalles clasificables aparecerán aquí.",
    "Fallback and unsupported sources are included in the count, so reported quality is only partial.": "Las fuentes de respaldo y no compatibles se incluyen en el conteo, por lo que la calidad informada es solo parcial.",
    "Fetching the recorded message list for this invocation.": "Obteniendo la lista de mensajes registrados para esta invocación.",
    "Filtered {kindLabel} vs leading lane": "{kindLabel} filtrado vs carril principal",
    "Find expensive work and audit pricing coverage without splitting conceptual sprint reruns.": "Encuentre trabajo costoso y audite la cobertura de precios sin dividir repeticiones de sprints conceptuales.",
    "Focused from pointer or keyboard inspection. Exact bucket values are shown below.": "Enfocado desde el puntero o inspección por teclado. Los valores exactos de los intervalos se muestran a continuación.",
    "Git, Jules, Jira, and other integrations are isolated from the main invocation table so external traffic stays easy to audit.": "Git, Jules, Jira y otras integraciones están aisladas de la tabla de invocación principal para que el tráfico externo sea fácil de auditar.",
    "Graph filters reset. {count} series active.": "Filtros de gráficos restablecidos. {count} series activas.",
    "Hover a bucket, tab into the chart, or move the range slider to inspect exact values.": "Pase el cursor sobre un intervalo, tabule hacia el gráfico o mueva el control deslizante de rango para inspeccionar valores exactos.",
    "Human-readable workflow intent with cost, volume, call count, and per-call context.": "Intención de flujo de trabajo legible por humanos con costo, volumen, cantidad de llamadas y contexto por llamada.",
    "Invocation ledger with sortable time, token, and duration columns. Rows include status, type, model, token counts, context, and transcript expansion controls.": "Registro de invocaciones con columnas ordenables de tiempo, token y duración. Las filas incluyen estado, tipo, modelo, recuentos de tokens, contexto y controles de expansión de la transcripción.",
    "Invocation-source counts are separated so estimated and unknown data are clear without treating fallback estimates as failures.": "Los recuentos de origen de invocación se separan para que los datos estimados y desconocidos sean claros sin tratar las estimaciones de respaldo como fallas.",
    "Keep at least one series enabled to inspect live bucket values.": "Mantenga al menos una serie habilitada para inspeccionar los valores de los intervalos en vivo.",
    "Keep at least one series enabled. The last active series cannot be turned off.": "Mantenga al menos una serie habilitada. La última serie activa no se puede apagar.",
    "Keep one series enabled so the chart can still render.": "Mantenga una serie habilitada para que el gráfico aún se pueda procesar.",
    "Keep one series enabled to preserve the chart.": "Mantenga una serie habilitada para preservar el gráfico.",
    "Leaderboard placement is based on limited invocation telemetry.": "La ubicación en la tabla de clasificación se basa en telemetría de invocación limitada.",
    "Legacy telemetry does not contain pricing coverage.": "La telemetría heredada no contiene cobertura de precios.",
    "Models are present, but none reported token volume in this window. Ranking falls back to labels until usage totals arrive.": "Hay modelos presentes, pero ninguno reportó volumen de tokens en esta ventana. La clasificación vuelve a las etiquetas hasta que lleguen los totales de uso.",
    "Move the pointer, focus a bucket, or use the range slider to pin exact values here.": "Mueva el puntero, enfoque un intervalo o use el control deslizante de rango para fijar valores exactos aquí.",
    "No canonical sprints with provider usage": "No hay sprints canónicos con uso de proveedor",
    "No estimated or unknown invocation-source counts were recorded in this window.": "No se registraron recuentos de origen de invocación estimados o desconocidos en esta ventana.",
    "No failed invocations or unavailable source counts were recorded in this window.": "No se registraron invocaciones fallidas ni recuentos de origen no disponibles en esta ventana.",
    "No invocation records match the current filter set, so rate and latency metrics are unavailable.": "No hay registros de invocación que coincidan con el conjunto de filtros actual, por lo que las métricas de velocidad y latencia no están disponibles.",
    "No priced bucket values are available.": "No hay valores de intervalo con precio disponibles.",
    "No provider usage was recorded, so there is no spend trend for this window.": "No se registró uso del proveedor, por lo que no hay tendencia de gasto para esta ventana.",
    "No records match the current filters or record view.": "Ningún registro coincide con los filtros actuales o la vista de registros.",
    "No source rows for telemetry quality": "No hay filas de origen para la calidad de la telemetría",
    "No task ledger rows in this window": "No hay filas de registro de tareas en esta ventana",
    "No tasks have cost telemetry in this window.": "Ninguna tarea tiene telemetría de costos en esta ventana.",
    "No tasks with provider usage": "No hay tareas con uso de proveedor",
    "No telemetry buckets are available for this window yet. Reset the zoom or adjust the Stats time range to restore the plot.": "Aún no hay intervalos de telemetría disponibles para esta ventana. Restablezca el zoom o ajuste el rango de tiempo de las Estadísticas para restaurar el gráfico.",
    "No telemetry counts were recorded for this window.": "No se registraron recuentos de telemetría para esta ventana.",
    "No telemetry source segments for this window.": "No hay segmentos de origen de telemetría para esta ventana.",
    "None of the {calls} invocations has a usable pricing source. Dollar totals are unavailable, not zero.": "Ninguna de las {calls} invocaciones tiene una fuente de precios utilizable. Los totales en dólares no están disponibles, no son cero.",
    "Normalized telemetry lines reveal shape instead of forcing tokens, duration, and invocation counts into one scale. Drag across the plot or the overview strip to zoom a timeframe, hover for exact bucket values, and use filters to focus the graph.": "Las líneas de telemetría normalizadas revelan la forma en lugar de forzar los recuentos de tokens, duración e invocaciones a una escala. Arrastre por el gráfico o la franja de descripción general para hacer zoom en un período de tiempo, pase el cursor para ver valores exactos del intervalo y use filtros para enfocar el gráfico.",
    "Operational blockers found in git ledgers": "Bloqueadores operativos encontrados en registros de git",
    "Overview - drag to zoom, arrow keys to pan, escape to reset": "Visión general: arrastre para acercar, teclas de flecha para desplazarse, escape para reiniciar",
    "Partial cost coverage — {unpriced} of {total} calls remain unpriced; shown spend is a minimum.": "Cobertura de costos parcial: {unpriced} de {total} llamadas permanecen sin precio; el gasto mostrado es un mínimo.",
    "Per-model telemetry across the selected window — token volume, reliability, latency distribution, cache efficiency, and output velocity for every model that participated.": "Telemetría por modelo en la ventana seleccionada — volumen de tokens, confiabilidad, distribución de latencia, eficiencia de caché y velocidad de salida para cada modelo que participó.",
    "Pinned from keyboard or range control. Exact values stay visible until focus changes.": "Fijado desde el teclado o control de rango. Los valores exactos permanecen visibles hasta que cambia el enfoque.",
    "Pinned overview to the full {count}-bucket range.": "Visión general fijada al rango completo de {count} intervalos.",
    "Project invocation workbench for sprint state, invocation health, external API activity, filters, pagination, and expandable message detail.": "Área de trabajo de invocación de proyectos para estado de sprint, salud de invocación, actividad de API externa, filtros, paginación y detalle de mensaje ampliable.",
    "Prompt, cache, generation, and reasoning lanes reconcile to the selected snapshot.": "Los carriles de solicitud, caché, generación y razonamiento se concilian con la instantánea seleccionada.",
    "Provider and model identities stay separate while cost and token shares remain comparable.": "Las identidades de proveedor y modelo se mantienen separadas mientras que los costos y las participaciones en tokens siguen siendo comparables.",
    "Provider invocation counts may still exist, but the snapshot did not include source-segment lanes to chart.": "Los recuentos de invocación del proveedor aún pueden existir, pero la instantánea no incluyó carriles de segmento de origen para graficar.",
    "Provider reliability cards will still appear below when provider rows exist without chartable token share.": "Las tarjetas de confiabilidad del proveedor seguirán apareciendo a continuación cuando existan filas de proveedores sin cuota de tokens graficable.",
    "Provider rows rank failure risk, source confidence, token volume, latency, and pricing signals for triage.": "Las filas de proveedores clasifican el riesgo de fallas, la confianza del origen, el volumen de tokens, la latencia y las señales de precios para el triaje.",
    "Provider usage was recorded, but no time buckets are available for this window.": "Se registró uso del proveedor, pero no hay intervalos de tiempo disponibles para esta ventana.",
    "Providers ranked by their contribution to total token volume.": "Proveedores clasificados por su contribución al volumen total de tokens.",
    "Refreshing the ledger rows and transcript expansion targets.": "Actualizando las filas del registro y los destinos de expansión de transcripciones.",
    "Refreshing trend telemetry from cache. Existing chart data remains visible.": "Actualizando la telemetría de tendencia desde la caché. Los datos existentes del gráfico permanecen visibles.",
    "Reported counts dominate this window.": "Los recuentos reportados dominan esta ventana.",
    "Reported, estimated, unavailable, unsupported, and unknown invocation-source counts across this window.": "Recuentos de origen de invocación reportados, estimados, no disponibles, no compatibles y desconocidos a lo largo de esta ventana.",
    "Review task and sprint git output by code churn, changed files, PR throughput, merges, and conflict signals.": "Revise la salida git de tareas y sprints por código cambiado, archivos cambiados, rendimiento de PR, fusiones y señales de conflicto.",
    "Search, server filters, record tabs, result counts, pagination, and expandable transcript detail stay in one operational record area.": "La búsqueda, los filtros del servidor, las pestañas de registros, el número de resultados, la paginación y el detalle de la transcripción ampliable permanecen en un área de registro operativo.",
    "Search, sort, and compare {kindLabel} by code churn, PRs opened, and changes merged.": "Buscar, ordenar y comparar {kindLabel} por código cambiado, PRs abiertos y cambios fusionados.",
    "Search, sort, and compare {kindLabel} by recency, tokens, active time, and directional token flow.": "Buscar, ordenar y comparar {kindLabel} por antigüedad, tokens, tiempo activo y flujo direccional de tokens.",
    "Selected analytics mode": "Modo de análisis seleccionado",
    "Showing {count} of {count1} {kindLabel} matching {query}, sorted by {sortLabelByKey} {sortDir}.": "Mostrando {count} de {count1} {kindLabel} que coinciden con {query}, ordenados por {sortLabelByKey} {sortDir}.",
    "Showing {count} of {count1} buckets, {buckets} through {buckets1}.": "Mostrando {count} de {count1} intervalos, {buckets} hasta {buckets1}.",
    "Single-bucket view. Zoom is unavailable until more buckets exist.": "Vista de un solo intervalo. El zoom no está disponible hasta que haya más intervalos.",
    "Spend across {count} time bucket. {detail}": "Gasto en {count} intervalo de tiempo. {detail}",
    "Spend across {count} time buckets. {detail}": "Gasto en {count} intervalos de tiempo. {detail}",
    "Spend excludes one or more unpriced invocations.": "El gasto excluye una o más invocaciones sin precio.",
    "Spend unavailable — this window does not contain enough cost data to price usage.": "Gasto no disponible: esta ventana no contiene suficientes datos de costos para calcular el uso.",
    "Spend, normalized rates, and pricing confidence from the shared Cost analytics model.": "Gasto, tasas normalizadas y confianza en los precios desde el modelo de análisis de costos compartido.",
    "Telemetry confidence, source mix, provider health, fallback usage, and failure pressure for the selected Stats window.": "Confianza en la telemetría, mezcla de orígenes, salud del proveedor, uso de respaldo y presión de falla para la ventana de Estadísticas seleccionada.",
    "The headline usage is preserved, but there is not enough bucket data to draw a trend.": "El uso principal se conserva, pero no hay suficientes datos de intervalo para dibujar una tendencia.",
    "This bucket has no usage totals available for the active series.": "Este intervalo no tiene totales de uso disponibles para la serie activa.",
    "This data set does not include classified Git, Jules, Jira, or other external API calls.": "Este conjunto de datos no incluye llamadas clasificadas de Git, Jules, Jira u otras API externas.",
    "This invocation has no stored message records to inspect.": "Esta invocación no tiene registros de mensajes almacenados para inspeccionar.",
    "This window has no model entries, so volume, latency, cache, and reasoning comparisons will appear after provider invocations are recorded.": "Esta ventana no tiene entradas de modelos, por lo que las comparaciones de volumen, latencia, caché y razonamiento aparecerán después de que se registren invocaciones del proveedor.",
    "Time and spend signals that explain the composition above.": "Señales de tiempo y gasto que explican la composición anterior.",
    "Toggle chart lines by category without leaving the usage graph.": "Alterne las líneas del gráfico por categoría sin salir del gráfico de uso.",
    "Token volume by provider appears here when the selected window includes provider segments.": "El volumen de tokens por proveedor aparece aquí cuando la ventana seleccionada incluye segmentos del proveedor.",
    "Token volume by provider, shown beside confidence and risk signals so high-volume providers stay easy to triage.": "El volumen de tokens por proveedor, se muestra junto a las señales de confianza y riesgo para que los proveedores de alto volumen sean fáciles de clasificar.",
    "Token volume split across the models active in this window, grouped into visible lanes.": "El volumen de tokens se divide en los modelos activos en esta ventana, agrupados en carriles visibles.",
    "Token volume, calls, cache behavior, and runtime efficiency without leaving the composition lens.": "Volumen de tokens, llamadas, comportamiento de la memoria caché y eficiencia del tiempo de ejecución sin salir del lente de composición.",
    "Token volume, invocation count, and active time by purpose over the selected window.": "Volumen de tokens, cantidad de invocaciones y tiempo activo por propósito durante la ventana seleccionada.",
    "Token-priced input, output, cache, and provider-reported fallback remain distinct.": "La entrada, la salida, la memoria caché y el respaldo informado por el proveedor, valorados en tokens, siguen siendo distintos.",
    "Transcript messages failed to load": "No se pudieron cargar los mensajes de la transcripción",
    "Transcript rendered as plain text for readability and safety.": "Transcripción renderizada como texto sin formato para legibilidad y seguridad.",
    "Trend telemetry could not be retrieved. The existing chart frame is preserved so you can retry without losing context.": "No se pudo recuperar la telemetría de tendencia. Se conserva el marco del gráfico existente para que pueda volver a intentarlo sin perder el contexto.",
    "Unpriced usage — {count} calls have usage telemetry but no usable price.": "Uso sin precio: {count} llamadas tienen telemetría de uso pero no tienen precio utilizable.",
    "Updating analytics from cached data. Current values remain visible while the latest snapshot loads.": "Actualizando el análisis a partir de los datos en caché. Los valores actuales permanecen visibles mientras se carga la última instantánea.",
    "Updating invocation records. Showing cached rows while the latest ledger loads.": "Actualizando registros de invocación. Se muestran las filas en caché mientras se carga el registro más reciente.",
    "Usage chart series switches": "Interruptores de series del gráfico de uso",
    "Usage graph controls": "Controles de gráfico de uso",
    "Use arrow keys, drag, or hover to move through the active window. Press Enter to zoom the focused bucket.": "Usa las teclas de flecha, arrastra o pasa el ratón por encima para desplazarte por la ventana activa. Pulsa Intro para ampliar el grupo enfocado.",
    "Waiting for Telemetry": "Esperando la telemetría",
    "Wall time not tracked": "El tiempo del muro no se rastreó",
    "Where usage landed": "Dónde recayó el uso",
    "Why tokens were spent": "Por qué se gastaron los tokens",
    "Window Volume": "Volumen de ventana",
    "Zoom becomes available after the next bucket lands.": "El zoom está disponible después de que el próximo intervalo aterrice.",
    "Zoom reset to the full {count}-bucket range.": "Zoom restablecido al rango completo de {count} intervalos.",
    "Zoomed overview to {startLabel} through {endLabel}, {count} of {count1} buckets.": "Visión general ampliada de {startLabel} a {endLabel}, {count} de {count1} intervalos.",
    "Zoomed telemetry window": "Ventana de telemetría ampliada",
    "Zoomed to {startLabel} through {endLabel}, {count} buckets.": "Ampliación a {startLabel} a {endLabel}, {count} intervalos.",
    "active series.": "series activas.",
    "all settled": "todo resuelto",
    "avg volume": "volumen promedio",
    "blended token rate": "tarifa de tokens combinada",
    "buckets and entity leaders": "intervalos y entidades líderes",
    "busiest buckets": "intervalos más ocupados",
    "cache hits": "aciertos de caché",
    "cached tokens": "tokens en caché",
    "files changed": "archivos cambiados",
    "finished model runs": "ejecuciones del modelo finalizadas",
    "generated output": "salida generada",
    "generation ratio": "relación de generación",
    "in view": "a la vista",
    "input reuse": "reutilización de entrada",
    "lines added": "líneas añadidas",
    "lines removed": "líneas eliminadas",
    "live right now": "en vivo ahora mismo",
    "matching \"{query}\"": "coincidiendo con \"{query}\"",
    "needs records": "necesita registros",
    "no active output": "no hay salida activa",
    "no failures in data": "sin errores en los datos",
    "no finished calls": "sin llamadas terminadas",
    "no lane yet": "sin carril aún",
    "no leader": "sin líder",
    "no pricing signal": "sin señal de precios",
    "no token share": "sin cuota de tokens",
    "of all window tokens.": "de todos los tokens de la ventana.",
    "of current window tokens": "de los tokens actuales de la ventana",
    "of leader": "del líder",
    "of visible churn": "de la alteración visible",
    "of visible volume": "del volumen visible",
    "pending outcomes": "resultados pendientes",
    "priced usage": "uso cobrado",
    "pricing unavailable": "precios no disponibles",
    "recorded across logs": "registrado en los logs",
    "reported calls": "llamadas reportadas",
    "series active.": "series activas.",
    "source counts": "conteos de origen",
    "sparse sample": "muestra dispersa",
    "tasks live": "tareas en vivo",
    "thinking tokens": "tokens de razonamiento",
    "token share": "participación en tokens",
    "token volume": "volumen de tokens",
    "tokens ranked by model volume": "tokens clasificados por volumen de modelo",
    "total churn": "alteración total",
    "unavailable or unsupported": "no disponible o no soportado",
    "unavailable or unsupported source counts": "conteos de origen no disponibles o no soportados",
    "unknown calls": "llamadas desconocidas",
    "zoomed timeframe": "plazo de tiempo ampliado"
};

const dictEsWords = {
    "telemetry": "telemetría", "stats": "estadísticas", "statistics": "estadísticas",
    "project": "proyecto", "analytics": "análisis", "window": "ventana",
    "generated": "generado", "mode": "modo", "sprint": "sprint",
    "start": "inicio", "end": "fin", "custom": "personalizado", "apply": "aplicar",
    "trend": "tendencia", "composition": "composición", "models": "modelos",
    "model": "modelo", "providers": "proveedores", "provider": "proveedor",
    "ledgers": "registros", "ledger": "registro", "system": "sistema",
    "active": "activo", "input": "entrada", "output": "salida", "cached": "en caché",
    "reasoning": "razonamiento", "status": "estado", "merges": "fusiones", "merge": "fusión",
    "median": "mediana", "metric": "métrica", "metrics": "métricas",
    "unavailable": "no disponible", "unknown": "desconocido", "unsupported": "no soportado",
    "reported": "reportado", "estimated": "estimado", "invocations": "invocaciones",
    "invocation": "invocación", "cost": "costo", "total": "total", "tokens": "tokens",
    "token": "token", "time": "tiempo", "rate": "tasa", "work": "trabajo", "spend": "gasto",
    "throughput": "rendimiento", "runtime": "tiempo de ejecución", "efficiency": "eficiencia",
    "success": "éxito", "latency": "latencia", "cache": "caché", "share": "cuota",
    "mix": "mezcla", "anatomy": "anatomía", "sources": "orígenes", "source": "origen",
    "purpose": "propósito", "purposes": "propósitos", "confidence": "confianza", "health": "salud",
    "failures": "fallos", "failure": "fallo", "investigate": "investigar", "clear": "borrar",
    "errors": "errores", "error": "error", "queue": "cola", "reliability": "confiabilidad",
    "portfolio": "portafolio", "measured": "medido", "optimized": "optimizado",
    "tasks": "tareas", "task": "tarea", "sprints": "sprints", "archive": "archivo",
    "diff": "diferencias", "git": "git", "blocked": "bloqueado", "blocks": "bloqueos",
    "healthy": "saludable", "live": "en vivo", "indexed": "indexado", "rows": "filas",
    "row": "fila", "single": "único", "provenance": "procedencia", "calls": "llamadas",
    "call": "llamada", "other": "otros", "recent": "reciente", "name": "nombre",
    "search": "buscar", "filter": "filtro", "filters": "filtros", "record": "registro",
    "records": "registros", "message": "mensaje", "messages": "mensajes", "all": "todo",
    "none": "ninguno", "yes": "sí", "no": "no", "and": "y", "or": "o", "of": "de",
    "for": "para", "the": "el", "in": "en", "to": "a", "is": "es", "are": "son",
    "with": "con", "this": "este", "that": "ese", "it": "lo", "data": "datos", "view": "vista",
    "views": "vistas", "show": "mostrar", "showing": "mostrando", "details": "detalles",
    "detail": "detalle", "summary": "resumen", "board": "tablero", "overview": "visión general",
    "insights": "perspectivas", "chart": "gráfico", "graph": "gráfico", "plot": "gráfico",
    "bucket": "intervalo", "buckets": "intervalos", "series": "serie", "zoom": "zoom",
    "range": "rango", "usage": "uso", "activity": "actividad", "volume": "volumen",
    "distribution": "distribución", "breakdown": "desglose", "speed": "velocidad",
    "velocity": "velocidad", "highest": "más alto", "lowest": "más bajo", "fastest": "más rápido",
    "slowest": "más lento", "best": "mejor", "worst": "peor", "top": "principal",
    "bottom": "inferior", "average": "promedio", "avg": "prom.", "count": "cantidad",
    "counts": "conteos", "value": "valor", "values": "valores", "percentage": "porcentaje",
    "percent": "por ciento", "number": "número", "size": "tamaño", "limit": "límite",
    "max": "máx", "min": "mín", "last": "último", "first": "primero", "next": "siguiente",
    "prev": "anterior", "previous": "anterior", "loading": "cargando", "loaded": "cargado",
    "failed": "falló", "done": "hecho", "ready": "listo", "waiting": "esperando",
    "started": "iniciado", "finished": "finalizado", "completed": "completado",
    "cancelled": "cancelado", "paused": "pausado", "running": "ejecutando",
    "empty": "vacío", "full": "completo", "partial": "parcial", "missing": "faltante",
    "found": "encontrado", "match": "coincidencia", "matches": "coincidencias", "matching": "coincidente",
    "sort": "ordenar", "sorted": "ordenado", "by": "por", "ascending": "ascendente",
    "descending": "descendente", "asc": "asc", "desc": "desc", "direction": "dirección",
    "column": "columna", "columns": "columnas", "table": "tabla", "list": "lista",
    "grid": "cuadrícula", "item": "elemento", "items": "elementos", "entry": "entrada",
    "entries": "entradas", "available": "disponible",

    "no activity yet": "Aún no hay actividad",
    "other providers": "Otros proveedores",
    "other models": "Otros modelos",
    "output / input": "Salida / Entrada",
    "no active series": "Ninguna serie activa",
    "no telemetry": "Sin telemetría",
    "provider reported": "Reportado por el proveedor",
    "mixed reported + fallback": "Reportado mixto + respaldo",
    "estimated fallback": "Respaldo estimado",
    "estimated mix": "Mezcla estimada",
    "no sparkline data": "Sin datos de minigráfico",
    "no provider invocations recorded": "No se registraron invocaciones de proveedores",
    "no outcome": "Sin resultado",
    "no cost": "Sin costo",
    "priced": "Con precio",
    "unpriced": "Sin precio",
    "no tokens": "Sin tokens",
    "no token telemetry in this window": "Sin telemetría de tokens en esta ventana",
    "no runs": "Sin ejecuciones",
    "latency samples unavailable": "Muestras de latencia no disponibles",
    "low data": "Pocos datos",
    "prompt-token cache telemetry unavailable": "Telemetría de caché de tokens de solicitud no disponible",
    "token velocity unavailable": "Velocidad de tokens no disponible",
    "provider share": "Cuota del proveedor",
    "no data": "Sin datos",
    "no provider rows in this window": "No hay filas de proveedores en esta ventana",
    "provider telemetry unavailable": "Telemetría del proveedor no disponible",
    "mixed": "Mixto",
    "single provider": "Proveedor único",
    "token anatomy": "Anatomía de token",
    "no token anatomy available": "No hay anatomía de token disponible",
    "source mix": "Mezcla de origen",
    "no source-count telemetry recorded": "No se registró telemetría de recuento de origen",
    "purpose activity": "Actividad de propósito",
    "no purpose activity recorded": "No se registró actividad de propósito",
    "purpose split unavailable": "División de propósito no disponible",
    "telemetry mix": "Mezcla de telemetría",
    "telemetry gaps": "Brechas de telemetría",
    "no invocation-source denominator": "Sin denominador de origen de invocación",
    "provider health": "Salud del proveedor",
    "no finished invocations to score": "No hay invocaciones finalizadas para evaluar",
    "strong": "Fuerte",
    "watch": "Observar",
    "at risk": "En riesgo",
    "no terminal failures recorded yet": "Aún no se registraron fallos terminales",
    "retry signals": "Señales de reintento",
    "runtime distribution unavailable": "Distribución del tiempo de ejecución no disponible",
    "top model": "Modelo principal",
    "no model telemetry yet": "Aún no hay telemetría de modelo",
    "model mix unavailable": "Mezcla de modelos no disponible",
    "success rate": "Tasa de éxito",
    "need completed model outcomes": "Se necesitan resultados de modelo completados",
    "active models": "Modelos activos",
    "distinct model rows with usage telemetry": "Filas de modelos distintas con telemetría de uso",
    "no model telemetry in this window": "Sin telemetría de modelos en esta ventana",
    "need at least one model row": "Se necesita al menos una fila de modelo",
    "single model": "Modelo único",
    "median latency": "Latencia mediana",
    "no finished invocation samples": "No hay muestras de invocaciones finalizadas",
    "latency ranking unavailable": "Clasificación de latencia no disponible",
    "cache hit rate": "Tasa de aciertos de caché",
    "cached input share of all prompt tokens": "Cuota de entrada en caché de todos los tokens de solicitud",
    "velocity ranking unavailable": "Clasificación de velocidad no disponible",
    "task rows": "Filas de tareas",
    "no task ledger rows in this window": "No hay filas de registro de tareas en esta ventana",
    "task scope unavailable": "Alcance de tarea no disponible",
    "scoped": "Alcance",
    "sprint rows": "Filas de sprints",
    "historical window": "Ventana histórica",
    "no sprint ledger rows in range": "No hay filas de registro de sprint en el rango",
    "files changed": "Archivos cambiados",
    "no file-change telemetry in range": "Sin telemetría de cambio de archivos en el rango",
    "diff scope unavailable": "Alcance de diferencias no disponible",
    "pull requests": "Pull Requests",
    "no pull request telemetry in range": "Sin telemetría de pull requests en el rango",
    "git totals unavailable": "Totales de Git no disponibles",
    "merge conflicts": "Conflictos de fusión",
    "operational blockers found in git ledgers": "Bloqueadores operativos encontrados en registros de git",
    "no merge-conflict blockers recorded": "No se registraron bloqueadores de conflicto de fusión",
    "git conflict scope unavailable": "Alcance de conflictos de Git no disponible",
    "blocked": "Bloqueado",
    "system health": "Salud del sistema",
    "no invocation outcomes to score": "No hay resultados de invocaciones para evaluar",
    "healthy": "Saludable",
    "live": "En vivo",
    "invocation rows": "Filas de invocación",
    "no invocation duration samples yet": "Aún no hay muestras de duración de invocaciones",
    "tool-call telemetry unavailable": "Telemetría de llamadas a herramientas no disponible",
    "provider rows": "Filas de proveedor",
    "no provider rows in the system view": "No hay filas de proveedores en la vista del sistema",
    "provider health unavailable": "Salud del proveedor no disponible",
    "model rows": "Filas de modelo",
    "no top model in the current window": "No hay modelo principal en la ventana actual",
    "model latency unavailable": "Latencia del modelo no disponible",
    "source rows": "Filas de origen",
    "no source rows for telemetry quality": "No hay filas de origen para la calidad de la telemetría",
    "cost analysis studio": "Estudio de análisis de costos",
    "total spend": "Gasto total",
    "average per task": "Promedio por tarea",
    "average per sprint": "Promedio por sprint",
    "no tasks with provider usage": "No hay tareas con uso de proveedor",
    "no canonical sprints with provider usage": "No hay sprints canónicos con uso de proveedor",
    "blended cost / 1m tokens": "Costo mixto / 1M tokens",
    "no tracked tokens for a blended rate": "No hay tokens rastreados para una tasa mixta",
    "unit cost": "Costo unitario",
    "pricing coverage": "Cobertura de precios",
    "no provider calls were recorded in this window": "No se registraron llamadas a proveedores en esta ventana",
    "token allocation": "Asignación de tokens",
    "what consumed tokens": "Qué consumió tokens",
    "total token volume": "Volumen total de tokens",
    "token lanes": "Áreas de tokens",
    "exact token allocation values": "Valores exactos de asignación de tokens",
    "no positive spend lanes.": "Sin áreas de gasto positivo.",
    "spend allocation": "Asignación de gasto",
    "where spend landed": "Dónde se asignó el gasto",
    "total recorded spend": "Gasto total registrado",
    "exact spend allocation values": "Valores exactos de asignación de gasto",
    "spend share": "Cuota de gasto",
    "token share": "Cuota de tokens",
    "cost / call": "Costo / llamada",
    "unclassified purpose": "Propósito no clasificado",
    "model not reported": "Modelo no reportado",
    "cost allocation": "Asignación de costos",
    "models driving spend": "Modelos que impulsan el gasto",
    "coverage unknown": "Cobertura desconocida",
    "fully priced": "Con precio completo",
    "partial coverage": "Cobertura parcial",
    "unpriced usage": "Uso sin precio",
    "no usage": "Sin uso",
    "no provider invocations were recorded in this window, so cost metrics are unavailable.": "No se registraron invocaciones de proveedores en esta ventana, por lo que las métricas de costos no están disponibles.",
    "partial pricing; value is a priced subtotal.": "Precio parcial; el valor es un subtotal con precio.",
    "usage is unpriced; no zero-dollar value is claimed.": "El uso no tiene precio; no se asume un valor de cero dólares.",
    "pricing coverage is unknown.": "Se desconoce la cobertura de precios.",
    "no cost value is available.": "No hay ningún valor de costo disponible.",
    "fully priced usage with a legitimate zero-dollar cost.": "Uso completamente con precio y un costo legítimo de cero dólares.",
    "pricing coverage is complete.": "La cobertura de precios está completa.",
    "no provider usage was recorded, so there is no spend trend for this window.": "No se registró uso de proveedores, por lo que no hay tendencia de gasto para esta ventana.",
    "provider usage was recorded, but no time buckets are available for this window.": "Se registró uso de proveedores, pero no hay intervalos de tiempo disponibles para esta ventana.",
    "no priced bucket values are available.": "No hay valores de intervalo con precio disponibles.",
    "time series": "Serie de tiempo",
    "spend over time": "Gasto a lo largo del tiempo",
    "chart marker key": "Leyenda de marcador de gráfico",
    "no usage in this window": "Sin uso en esta ventana",
    "no time buckets available": "No hay intervalos de tiempo disponibles",
    "no price": "Sin precio",
    "spend buckets": "Intervalos de gasto",
    "focused bucket": "Intervalo enfocado",
    "exact spend": "Gasto exacto",
    "coverage": "Cobertura",
    "spend over time data": "Datos de gasto a lo largo del tiempo",
    "priced subtotal; unpriced calls excluded": "Subtotal con precio; llamadas sin precio excluidas",
    "across the selected window": "En la ventana seleccionada",
    "no sprints with provider usage": "Sin sprints con uso de proveedor",
    "cost per invocation": "Costo por invocación",
    "no provider calls": "Sin llamadas de proveedor",
    "no tracked tokens": "Sin tokens rastreados",
    "cost executive overview": "Visión general ejecutiva de costos",
    "cost intelligence": "Inteligencia de costos",
    "executive overview": "Visión general ejecutiva",
    "full coverage": "Cobertura total",
    "filtered spend": "Gasto filtrado",
    "pricing provenance": "Procedencia de precios",
    "status unavailable": "Estado no disponible",
    "last activity": "Última actividad",
    "token mix": "Mezcla de tokens",
    "no search filter.": "Sin filtro de búsqueda.",
    "cost ledgers": "Registros de costos",
    "task and sprint spend": "Gasto de tarea y sprint",
    "clear cost ledger search": "Borrar búsqueda de registro de costos",
    "no tasks have cost telemetry in this window.": "Ninguna tarea tiene telemetría de costos en esta ventana.",
    "no sprints have cost telemetry in this window.": "Ningún sprint tiene telemetría de costos en esta ventana.",
    "clear search": "Borrar búsqueda"
};

function translatePhrase(enText) {
    const normEn = enText.replace(/\s+/g, ' ').trim();
    if (translations[normEn]) return translations[normEn];

    for (const [k, v] of Object.entries(translations)) {
        if (k.toLowerCase() === normEn.toLowerCase()) {
            if (enText === enText.toUpperCase()) return v.toUpperCase();
            if (enText[0] === enText[0].toUpperCase()) return v.charAt(0).toUpperCase() + v.slice(1);
            return v;
        }
    }

    let result = '';
    const pRegex = /(\{[^}]+\})/g;
    const parts = enText.split(pRegex);
    for (const part of parts) {
        if (part.startsWith('{') && part.endsWith('}')) {
            result += part;
        } else {
            let transPart = '';
            let currentWord = '';
            for (let i = 0; i < part.length; i++) {
                const char = part[i];
                if (/[a-zA-Z]/.test(char)) {
                    currentWord += char;
                } else {
                    if (currentWord.length > 0) {
                        const lw = currentWord.toLowerCase();
                        if (dictEsWords[lw]) {
                            const trans = dictEsWords[lw];
                            if (currentWord === currentWord.toUpperCase()) transPart += trans.toUpperCase();
                            else if (currentWord[0] === currentWord[0].toUpperCase()) transPart += trans.charAt(0).toUpperCase() + trans.slice(1);
                            else transPart += trans;
                        } else {
                            transPart += currentWord;
                        }
                        currentWord = '';
                    }
                    transPart += char;
                }
            }
            if (currentWord.length > 0) {
                const lw = currentWord.toLowerCase();
                if (dictEsWords[lw]) {
                    const trans = dictEsWords[lw];
                    if (currentWord === currentWord.toUpperCase()) transPart += trans.toUpperCase();
                    else if (currentWord[0] === currentWord[0].toUpperCase()) transPart += trans.charAt(0).toUpperCase() + trans.slice(1);
                    else transPart += trans;
                } else {
                    transPart += currentWord;
                }
            }
            result += transPart;
        }
    }

    if (result.length > 0 && enText[0] && enText[0] === enText[0].toUpperCase()) {
        result = result.charAt(0).toUpperCase() + result.slice(1);
    }
    return result;
}

function groupLines(lines, isEs) {
    let result = '';
    let currentLine = '';
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;
        if (isEs) {
            line = line.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, p1) => {
                return '"' + translatePhrase(p1) + '"';
            });
        }
        if (/^[a-zA-Z0-9_]+\s*:/.test(line) || /^"?[a-zA-Z0-9_]+"?\s*:/.test(line)) {
            if (currentLine.length > 200 || i % 5 === 0) {
                result += '    ' + currentLine.trim() + '\n';
                currentLine = '';
            }
            currentLine += (currentLine ? ' ' : '') + line;
        } else {
            currentLine += '\n' + line;
        }
    }
    if (currentLine) {
        result += '    ' + currentLine.trim() + '\n';
    }
    return result.replace(/\n\s*\n/g, '\n');
}

let content = fs.readFileSync('dashboard/src/v2/i18n/messages/stats.ts', 'utf8');

// Fix newline in activeSeriesSummary
content = content.replace(/"Active series: \{\nseries\}\."/g, '"Active series: {series}."');

const enM = content.match(/en:\s*\{([\s\S]*?)\s*\},\s*de:\s*\{/);
const deM = content.match(/de:\s*\{([\s\S]*?)\s*\}\s*,?\s*\}\);/);

const newEnLines = [];
const newDeLines = [];
const newEsLines = [];

for (const item of extracted) {
    let key = item.key;
    if (key === 'default') key = '"default"';

    const enEsc = item.en.replace(/"/g, '\\"');
    const deEsc = item.de.replace(/"/g, '\\"');
    const esEsc = translatePhrase(item.en).replace(/"/g, '\\"');

    newEnLines.push(`    ${key}: "${enEsc}",`);
    newDeLines.push(`    ${key}: "${deEsc}",`);
    newEsLines.push(`    ${key}: "${esEsc}",`);
}

const newEn = groupLines((enM[1] + '\n' + newEnLines.join('\n')).split('\n'), false);
const newDe = groupLines((deM[1] + '\n' + newDeLines.join('\n')).split('\n'), false);
const newEs = groupLines((enM[1] + '\n' + newEsLines.join('\n')).split('\n'), true);

const finalContent = `import { defineDashboardMessages } from "../locales.js";

export const statsMessages = defineDashboardMessages({
  en: {
${newEn}
  },
  de: {
${newDe}
  },
  es: {
${newEs}
  },
});
`;

fs.writeFileSync('dashboard/src/v2/i18n/messages/stats.ts', finalContent);
"""
