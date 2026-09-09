import type { AiServiceId } from '../../shared/ai-services';

export interface PromptAdapterConfig {
  serviceId: AiServiceId;
  inputSelectors: readonly string[];
  submitSelectors: readonly string[];
}

export interface PromptAdapter {
  serviceId: AiServiceId;
  buildScript: (prompt: string) => string;
}

export interface AdapterExecutionResult {
  success: boolean;
  message: string;
}
