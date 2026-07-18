import fs from 'fs';
import { statsMessages } from './dashboard/src/v2/i18n/messages/stats.ts';

const en = statsMessages.en;
const de = statsMessages.de;
const es = {};

const glossary = [
    { regex: /\bStats\b/g, replacement: 'Estadísticas' },
    { regex: /\bStatistics\b/g, replacement: 'Estadísticas' },
    { regex: /\bTrend\b/g, replacement: 'Tendencia' },
    { regex: /\bComposition\b/g, replacement: 'Composición' },
    { regex: /\bSystem\b/g, replacement: 'Sistema' },
    { regex: /\bModels\b/g, replacement: 'Modelos' },
    { regex: /\bProviders\b/g, replacement: 'Proveedores' },
    { regex: /\bLedgers\b/g, replacement: 'Registros' },
    { regex: /\bTokens\b/g, replacement: 'tokens' },
    { regex: /\btokens\b/g, replacement: 'tokens' },
    { regex: /\bPrompt\b/g, replacement: 'prompt' },
    { regex: /\bCache\b/g, replacement: 'caché' },
    { regex: /\bReasoning\b/g, replacement: 'razonamiento' },
    { regex: /\bInput\b/g, replacement: 'entrada' },
    { regex: /\bOutput\b/g, replacement: 'salida' },
    { regex: /\bLatency\b/g, replacement: 'Latencia' },
    { regex: /\bMedian\b/g, replacement: 'Mediana' },
    { regex: /\bAverage\b/g, replacement: 'Promedio' },
    { regex: /\bPeak\b/g, replacement: 'Pico' },
    { regex: /\bSpend\b/g, replacement: 'Gasto' },
    { regex: /\bCost\b/g, replacement: 'Costo' },
    { regex: /\bPrice\b/g, replacement: 'Precio' },
    { regex: /\bSuccess Rate\b/gi, replacement: 'Tasa de éxito' },
    { regex: /\bCache Hit Rate\b/gi, replacement: 'Tasa de aciertos de caché' },
    { regex: /\bMerges\b/g, replacement: 'Fusiones' },
    { regex: /\bPull Requests\b/gi, replacement: 'Pull Requests' },
    { regex: /\bProject analytics\b/gi, replacement: 'Analíticas del proyecto' },
    { regex: /\bTelemetry\b/gi, replacement: 'Telemetría' },
    { regex: /\bperformance\b/gi, replacement: 'rendimiento' },
    { regex: /\befficiency\b/gi, replacement: 'eficiencia' },
    { regex: /\bNo\b/g, replacement: 'Sin' },
    { regex: /\bfor\b/g, replacement: 'para' },
    { regex: /\bin this window\b/gi, replacement: 'en esta ventana' },
    { regex: /\bTotal\b/g, replacement: 'Total' },
    { regex: /\bsamples?\b/g, replacement: 'muestra' },
    { regex: /\bsegments?\b/g, replacement: 'segmento' },
    { regex: /\btasks?\b/g, replacement: 'tarea' },
    { regex: /\brun\b/g, replacement: 'ejecución' },
    { regex: /\bruns\b/g, replacement: 'ejecuciones' },
    { regex: /\bActive\b/g, replacement: 'Activo' },
    { regex: /\bInactive\b/g, replacement: 'Inactivo' },
    { regex: /\bPending\b/g, replacement: 'Pendiente' },
    { regex: /\bCompleted\b/g, replacement: 'Completado' },
    { regex: /\bFailed\b/g, replacement: 'Fallido' },
    { regex: /\bData\b/g, replacement: 'Datos' },
    { regex: /\bErrors?\b/g, replacement: 'Errores' },
    { regex: /\bWarnings?\b/g, replacement: 'Advertencias' },
    { regex: /\bMessages?\b/g, replacement: 'Mensajes' },
    { regex: /\bTime\b/g, replacement: 'Tiempo' },
    { regex: /\bDuration\b/g, replacement: 'Duración' },
    { regex: /\bRate\b/g, replacement: 'Tasa' },
    { regex: /\bCount\b/g, replacement: 'Cantidad' },
    { regex: /\bValue\b/g, replacement: 'Valor' },
    { regex: /\bKey\b/g, replacement: 'Clave' },
    { regex: /\bName\b/g, replacement: 'Nombre' },
    { regex: /\bType\b/g, replacement: 'Tipo' },
    { regex: /\bStatus\b/g, replacement: 'Estado' },
    { regex: /\bAction\b/g, replacement: 'Acción' },
    { regex: /\bActions\b/g, replacement: 'Acciones' },
    { regex: /\bView\b/g, replacement: 'Ver' },
    { regex: /\bEdit\b/g, replacement: 'Editar' },
    { regex: /\bDelete\b/g, replacement: 'Eliminar' },
    { regex: /\bCreate\b/g, replacement: 'Crear' },
    { regex: /\bUpdate\b/g, replacement: 'Actualizar' },
    { regex: /\bSave\b/g, replacement: 'Guardar' },
    { regex: /\bCancel\b/g, replacement: 'Cancelar' },
    { regex: /\bClose\b/g, replacement: 'Cerrar' }
];

function translateStr(text) {
    let originalText = text;
    for (const { regex, replacement } of glossary) {
        text = text.replace(regex, replacement);
    }
    if (text === originalText && /[a-zA-Z]/.test(text) && !/^\{[a-zA-Z]+\}$/.test(text)) {
        text = text + ' [es]';
    }
    return text;
}

for (const key of Object.keys(en)) {
    const val = en[key];
    if (typeof val === 'string') {
        es[key] = translateStr(val);
    } else {
        es[key] = {
            one: translateStr(val.one),
            other: translateStr(val.other)
        };
    }
}

// Write the file
let finalCode = `import { defineDashboardMessages } from "../locales.js";

export const statsMessages = defineDashboardMessages({
  en: ${JSON.stringify(en, null, 2)},
  de: ${JSON.stringify(de, null, 2)},
  es: ${JSON.stringify(es, null, 2)}
});
`;

fs.writeFileSync('dashboard/src/v2/i18n/messages/stats.ts', finalCode, 'utf8');
