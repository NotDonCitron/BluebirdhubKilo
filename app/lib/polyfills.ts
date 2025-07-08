// Browser polyfills for Node.js APIs

// setImmediate polyfill for browser compatibility
if (typeof window !== 'undefined' && !(window as any).setImmediate) {
  (window as any).setImmediate = function(callback: (...args: any[]) => void, ...args: any[]) {
    return setTimeout(() => callback(...args), 0);
  };
}

// clearImmediate polyfill for browser compatibility
if (typeof window !== 'undefined' && !(window as any).clearImmediate) {
  (window as any).clearImmediate = function(id: any) {
    clearTimeout(id);
  };
}

// global polyfill for browser compatibility
if (typeof window !== 'undefined' && !(window as any).global) {
  (window as any).global = window;
}

// process polyfill for browser compatibility
if (typeof window !== 'undefined' && !(window as any).process) {
  (window as any).process = {
    env: {},
    nextTick: (callback: () => void) => setTimeout(callback, 0),
    version: '',
    versions: {},
    platform: 'browser',
    browser: true,
    argv: [],
    pid: 0,
    title: 'browser',
    cwd: () => '/',
    chdir: () => {},
    umask: () => 0,
    exit: () => {},
    kill: () => {},
    binding: () => {},
    hrtime: () => [0, 0],
    uptime: () => 0,
    memoryUsage: () => ({ rss: 0, heapTotal: 0, heapUsed: 0, external: 0 }),
    cpuUsage: () => ({ user: 0, system: 0 }),
    resourceUsage: () => ({ userCPUTime: 0, systemCPUTime: 0, maxRSS: 0, sharedMemorySize: 0, unsharedDataSize: 0, unsharedStackSize: 0, minorPageFault: 0, majorPageFault: 0, swappedOut: 0, fsRead: 0, fsWrite: 0, ipcSent: 0, ipcReceived: 0, signalsCount: 0, voluntaryContextSwitches: 0, involuntaryContextSwitches: 0 }),
    stdout: { write: () => {} },
    stderr: { write: () => {} },
    stdin: { read: () => null },
    on: () => {},
    once: () => {},
    off: () => {},
    removeListener: () => {},
    removeAllListeners: () => {},
    emit: () => false,
    prependListener: () => {},
    prependOnceListener: () => {},
    listeners: () => [],
    listenerCount: () => 0,
    eventNames: () => [],
    getMaxListeners: () => 0,
    setMaxListeners: () => {},
    rawListeners: () => [],
  } as any;
}

// Buffer polyfill for browser compatibility
if (typeof window !== 'undefined' && !(window as any).Buffer) {
  // Simple Buffer polyfill - for production use a proper polyfill like buffer
  (window as any).Buffer = {
    from: (data: any) => new TextEncoder().encode(data.toString()),
    isBuffer: () => false,
    concat: (buffers: any[]) => {
      const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const buf of buffers) {
        result.set(buf, offset);
        offset += buf.length;
      }
      return result;
    },
  } as any;
}

// Export empty object to make this a valid module
export {};