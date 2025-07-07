import '@testing-library/jest-dom';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    };
  },
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: {
      user: {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
      },
    },
    status: 'authenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }) => children,
}));

// Mock fetch globally
global.fetch = jest.fn();

// Mock FileReader for file upload tests
class MockFileReader {
  constructor() {
    this.readyState = 0;
    this.result = null;
    this.error = null;
    this.onload = null;
    this.onerror = null;
    this.onloadend = null;
    this.onprogress = null;
  }

  readAsArrayBuffer(file) {
    this.readyState = 1;
    setTimeout(() => {
      this.readyState = 2;
      this.result = new ArrayBuffer(file.size || 0);
      if (this.onload) this.onload({ target: this });
      if (this.onloadend) this.onloadend({ target: this });
    }, 0);
  }

  readAsText(file) {
    this.readyState = 1;
    setTimeout(() => {
      this.readyState = 2;
      this.result = file.content || '';
      if (this.onload) this.onload({ target: this });
      if (this.onloadend) this.onloadend({ target: this });
    }, 0);
  }

  readAsDataURL(file) {
    this.readyState = 1;
    setTimeout(() => {
      this.readyState = 2;
      this.result = `data:${file.type || 'application/octet-stream'};base64,${btoa(file.content || '')}`;
      if (this.onload) this.onload({ target: this });
      if (this.onloadend) this.onloadend({ target: this });
    }, 0);
  }

  abort() {
    this.readyState = 2;
    if (this.onloadend) this.onloadend({ target: this });
  }
}

global.FileReader = MockFileReader;

// Mock File constructor
global.File = class MockFile {
  constructor(parts, name, options = {}) {
    this.name = name;
    this.size = parts.reduce((acc, part) => acc + (part.length || 0), 0);
    this.type = options.type || '';
    this.lastModified = options.lastModified || Date.now();
    this.content = parts.join('');
  }
};

// Mock URL methods for file downloads
global.URL.createObjectURL = jest.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = jest.fn();

// Mock hasPointerCapture for jsdom compatibility (only if Element exists)
if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture = jest.fn(() => false);
  Element.prototype.setPointerCapture = jest.fn();
  Element.prototype.releasePointerCapture = jest.fn();
}

// Mock resizeObserver (only if in browser-like environment)
if (typeof window !== 'undefined') {
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
}

// Mock scrollIntoView (only if Element exists)
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = jest.fn();
}

// Mock getBoundingClientRect (only if Element exists)
if (typeof Element !== 'undefined') {
  Element.prototype.getBoundingClientRect = jest.fn(() => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    toJSON: jest.fn(),
  }));
}

// Mock EventSource for SSE tests
class MockEventSource {
  constructor(url) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    this.CONNECTING = 0;
    this.OPEN = 1;
    this.CLOSED = 2;
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;
    this.listeners = {};
    this._isSimulated = false;
    
    // Use a longer timeout to ensure hook setup completes
    this._openTimeout = setTimeout(() => {
      if (this.readyState !== 2 && !this._isSimulated) { // Only if not already closed or manually triggered
        this._simulateOpen();
      }
    }, 10); // Slightly longer delay for hook setup
  }

  _simulateOpen() {
    if (this.readyState === 2) return; // Don't open if already closed
    if (this.readyState === 1) return; // Already open
    
    this.readyState = 1; // OPEN
    this._isSimulated = true;
    
    const openEvent = new Event('open');
    
    // Trigger onopen handler
    if (this.onopen) {
      this.onopen(openEvent);
    }
    
    // Trigger addEventListener handlers
    if (this.listeners.open) {
      this.listeners.open.forEach(handler => handler(openEvent));
    }
  }

  addEventListener(event, handler) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
    
    // If adding an open listener and already opened, trigger immediately
    if (event === 'open' && this.readyState === 1) {
      setTimeout(() => handler(new Event('open')), 0);
    }
  }

  removeEventListener(event, handler) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(h => h !== handler);
    }
  }

  close() {
    if (this._openTimeout) {
      clearTimeout(this._openTimeout);
    }
    
    this.readyState = 2; // CLOSED
    
    const closeEvent = new Event('close');
    
    if (this.onclose) {
      this.onclose(closeEvent);
    }
    
    // Trigger close event listeners
    if (this.listeners.close) {
      this.listeners.close.forEach(handler => handler(closeEvent));
    }
  }

  // Helper method to simulate receiving a message
  simulateMessage(data) {
    if (this.readyState !== 1) return; // Only send messages when connected
    
    const event = new MessageEvent('message', { data });
    if (this.onmessage) {
      this.onmessage(event);
    }
    if (this.listeners.message) {
      this.listeners.message.forEach(handler => handler(event));
    }
  }

  // Helper method to simulate an error
  simulateError() {
    const event = new Event('error');
    this.readyState = 2; // Connection lost
    
    if (this.onerror) {
      this.onerror(event);
    }
    if (this.listeners.error) {
      this.listeners.error.forEach(handler => handler(event));
    }
  }

  // Helper method to immediately simulate opening (for tests)
  simulateOpen() {
    if (this._openTimeout) {
      clearTimeout(this._openTimeout);
    }
    this._simulateOpen();
  }
}

global.EventSource = jest.fn((url) => new MockEventSource(url));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
  },
  Toaster: () => null,
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    span: 'span',
    button: 'button',
    form: 'form',
  },
  AnimatePresence: ({ children }) => children,
}));

// Mock Radix UI components
const createMockComponent = (name, defaultElement = 'div') => {
  const Component = ({ children, ...props }) => {
    const Element = defaultElement;
    // Filter out Radix-specific props that shouldn't be passed to DOM elements
    const { asChild, onValueChange, onCheckedChange, ...domProps } = props;
    return <Element {...domProps}>{children}</Element>;
  };
  Component.displayName = name;
  return Component;
};

jest.mock('@radix-ui/react-select', () => ({
  Root: createMockComponent('SelectRoot'),
  Trigger: createMockComponent('SelectTrigger', 'button'),
  Value: createMockComponent('SelectValue', 'span'),
  Icon: createMockComponent('SelectIcon', 'span'),
  Portal: createMockComponent('SelectPortal'),
  Content: createMockComponent('SelectContent'),
  Viewport: createMockComponent('SelectViewport'),
  Item: createMockComponent('SelectItem'),
  ItemText: createMockComponent('SelectItemText', 'span'),
  ItemIndicator: createMockComponent('SelectItemIndicator', 'span'),
  ScrollUpButton: createMockComponent('SelectScrollUpButton', 'button'),
  ScrollDownButton: createMockComponent('SelectScrollDownButton', 'button'),
  Separator: createMockComponent('SelectSeparator', 'hr'),
  Label: createMockComponent('SelectLabel', 'label'),
  Group: createMockComponent('SelectGroup'),
}));

jest.mock('@radix-ui/react-switch', () => ({
  Root: ({ checked, onCheckedChange, ...props }) => {
    const Component = createMockComponent('SwitchRoot', 'button');
    return (
      <Component
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange && onCheckedChange(!checked)}
        {...props}
      />
    );
  },
  Thumb: createMockComponent('SwitchThumb', 'span'),
}));

jest.mock('@radix-ui/react-dialog', () => ({
  Root: createMockComponent('DialogRoot'),
  Trigger: createMockComponent('DialogTrigger', 'button'),
  Portal: createMockComponent('DialogPortal'),
  Overlay: createMockComponent('DialogOverlay'),
  Content: createMockComponent('DialogContent'),
  Title: createMockComponent('DialogTitle', 'h2'),
  Description: createMockComponent('DialogDescription', 'p'),
  Close: createMockComponent('DialogClose', 'button'),
}));

jest.mock('@radix-ui/react-dropdown-menu', () => ({
  Root: createMockComponent('DropdownMenuRoot'),
  Trigger: createMockComponent('DropdownMenuTrigger', 'button'),
  Portal: createMockComponent('DropdownMenuPortal'),
  Content: createMockComponent('DropdownMenuContent'),
  Item: createMockComponent('DropdownMenuItem'),
  Separator: createMockComponent('DropdownMenuSeparator', 'hr'),
  Label: createMockComponent('DropdownMenuLabel'),
  CheckboxItem: createMockComponent('DropdownMenuCheckboxItem'),
  RadioGroup: createMockComponent('DropdownMenuRadioGroup'),
  RadioItem: createMockComponent('DropdownMenuRadioItem'),
  Arrow: createMockComponent('DropdownMenuArrow'),
  Group: createMockComponent('DropdownMenuGroup'),
  Sub: createMockComponent('DropdownMenuSub'),
  SubTrigger: createMockComponent('DropdownMenuSubTrigger'),
  SubContent: createMockComponent('DropdownMenuSubContent'),
}));

jest.mock('@radix-ui/react-alert-dialog', () => ({
  Root: createMockComponent('AlertDialogRoot'),
  Trigger: createMockComponent('AlertDialogTrigger', 'button'),
  Portal: createMockComponent('AlertDialogPortal'),
  Overlay: createMockComponent('AlertDialogOverlay'),
  Content: createMockComponent('AlertDialogContent'),
  Header: createMockComponent('AlertDialogHeader'),
  Footer: createMockComponent('AlertDialogFooter'),
  Title: createMockComponent('AlertDialogTitle', 'h2'),
  Description: createMockComponent('AlertDialogDescription', 'p'),
  Action: createMockComponent('AlertDialogAction', 'button'),
  Cancel: createMockComponent('AlertDialogCancel', 'button'),
}));

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});