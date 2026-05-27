import type { WebMCPToolDescriptor } from '@/components/webmcp/types/webmcp';

const noop = () => {};

export function hasModelContext(
  navigatorLike: Navigator | undefined =
    typeof navigator === 'undefined' ? undefined : navigator
): navigatorLike is Navigator & {
  modelContext: NonNullable<Navigator['modelContext']>;
} {
  return typeof navigatorLike?.modelContext?.registerTool === 'function';
}

export function registerWebMCPTools(
  tools: readonly WebMCPToolDescriptor[],
  navigatorLike: Navigator | undefined =
    typeof navigator === 'undefined' ? undefined : navigator
) {
  if (!hasModelContext(navigatorLike)) {
    return noop;
  }

  const controller = new AbortController();

  try {
    for (const tool of tools) {
      navigatorLike.modelContext.registerTool(tool, {
        signal: controller.signal,
      });
    }
  } catch (error) {
    controller.abort();
    throw error;
  }

  return () => {
    controller.abort();
  };
}
