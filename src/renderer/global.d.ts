export {};

declare global {
  interface Window {
    multiAI: {
      ping: () => Promise<string>;
    };
  }
}
