import { getLiveQuantumSignals, ETISignalPayload } from './quantumSignalsService';

export interface DispatchResultItem {
  signal_id: string;
  symbol: string;
  success: boolean;
  status_code?: number;
  latency_ms: number;
  response?: any;
  error?: string;
}

export interface WebhookDispatchSummary {
  timestamp: string;
  target_url: string;
  total_signals: number;
  successful: number;
  failed: number;
  total_time_ms: number;
  items: DispatchResultItem[];
}

const DEFAULT_ETRADE_WEBHOOK_URL = process.env.ETRADE_WEBHOOK_URL || 'http://localhost:8000/api/v1/options/eti/signals';

/**
 * Despacha cada señal individual mediante HTTP POST a eTrade (cero latencia)
 */
export async function dispatchSignalsToEtradeWebhook(
  targetUrl: string = DEFAULT_ETRADE_WEBHOOK_URL,
  signalsOverride?: ETISignalPayload[]
): Promise<WebhookDispatchSummary> {
  const globalStart = performance.now();
  const signals = signalsOverride || await getLiveQuantumSignals(false);
  const items: DispatchResultItem[] = [];

  for (const signal of signals) {
    const start = performance.now();
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ETI-Quantum-Webhook/2.3',
        },
        body: JSON.stringify(signal),
        signal: AbortSignal.timeout(3500),
      });

      const latencyMs = Math.round(performance.now() - start);
      let responseBody: any = null;
      try {
        responseBody = await response.json();
      } catch {
        responseBody = await response.text();
      }

      items.push({
        signal_id: signal.signal_id,
        symbol: signal.symbol,
        success: response.ok,
        status_code: response.status,
        latency_ms: latencyMs,
        response: responseBody,
      });
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      items.push({
        signal_id: signal.signal_id,
        symbol: signal.symbol,
        success: false,
        latency_ms: latencyMs,
        error: err.message || 'Error de conexión con el webhook de eTrade',
      });
    }
  }

  const totalTimeMs = Math.round(performance.now() - globalStart);
  const successful = items.filter(i => i.success).length;

  return {
    timestamp: new Date().toISOString(),
    target_url: targetUrl,
    total_signals: signals.length,
    successful,
    failed: signals.length - successful,
    total_time_ms: totalTimeMs,
    items,
  };
}
