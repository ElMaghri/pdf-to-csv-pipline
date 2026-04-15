/**
 * Simple concurrency limiter utility - alternative to p-limit
 * for CommonJS compatibility
 */

export function createConcurrencyLimit(
  concurrency: number,
): (fn: () => Promise<any>) => Promise<any> {
  let activeCount = 0;
  const queue: Array<{
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  function processQueue() {
    while (activeCount < concurrency && queue.length > 0) {
      activeCount++;
      const { fn, resolve, reject } = queue.shift()!;

      fn()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          activeCount--;
          processQueue();
        });
    }
  }

  return (fn: () => Promise<any>) => {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      processQueue();
    });
  };
}
