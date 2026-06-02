export function postToPlugin(message: Record<string, unknown>) {
  parent.postMessage({ pluginMessage: message }, "*");
}

export function onPluginMessage<T extends { type: string }>(
  handler: (message: T) => void,
) {
  const listener = (event: MessageEvent) => {
    const message = event.data.pluginMessage as T | undefined;
    if (message) handler(message);
  };
  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}
