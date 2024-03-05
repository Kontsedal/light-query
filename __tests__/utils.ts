export function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export const waitUntil = async (
  fn: () => boolean | Promise<boolean>,
  interval = 50,
  maxAttempts = 5
) => {
  let attempts = 0;
  async function tick() {
    attempts++;
    const result = await fn();
    if (!result && attempts >= maxAttempts) {
      throw new Error("waitUntil timeout");
    }
    if (!result) {
      await wait(interval);
      return tick();
    }
  }
  return tick();
};
