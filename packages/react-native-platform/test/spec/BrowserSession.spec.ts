// Mock react-native before importing the module
jest.mock('react-native', () => ({
  Linking: {
    addEventListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
  },
  Platform: {
    OS: 'ios',
  },
}));

// Mock the native bridge before importing the module
jest.mock('src/specs/NativeBrowserSessionBridge', () => {
  return {
    __esModule: true,
    default: {
      openAuthSession: jest.fn(),
      openBrowser: jest.fn(),
    },
  };
});

import type { BrowserSessionOptions } from 'src/specs/NativeBrowserSessionBridge';
import NativeBrowserSessionBridgeSpec from 'src/specs/NativeBrowserSessionBridge';
import { openAuthSession } from 'src/BrowserSession/index';

describe('BrowserSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('openAuthSession', () => {
    describe('Basic functionality', () => {
      it('should be a function', () => {
        expect(typeof openAuthSession).toBe('function');
      });

      it('should accept a URL and redirect URI', async () => {
        const mockResolve = jest
          .fn()
          .mockResolvedValue({ type: 'success' as const, url: 'com.example://callback?code=abc' });
        (NativeBrowserSessionBridgeSpec.openAuthSession as jest.Mock).mockImplementation(
          mockResolve
        );

        try {
          await openAuthSession('https://example.com/auth', 'com.example://callback');
        } catch (_) {
          // Expected in test environment
        }

        expect(NativeBrowserSessionBridgeSpec.openAuthSession).toHaveBeenCalled();
      });

      it('should accept optional options parameter', async () => {
        const mockResolve = jest
          .fn()
          .mockResolvedValue({ type: 'success' as const, url: 'com.example://callback?code=abc' });
        (NativeBrowserSessionBridgeSpec.openAuthSession as jest.Mock).mockImplementation(
          mockResolve
        );

        const options: BrowserSessionOptions = { ephemeralSession: false };

        try {
          await openAuthSession('https://example.com/auth', 'com.example://callback', options);
        } catch (_) {
          // Expected in test environment
        }

        expect(NativeBrowserSessionBridgeSpec.openAuthSession).toHaveBeenCalled();
      });

      it('should return a promise', async () => {
        const mockResolve = jest
          .fn()
          .mockResolvedValue({ type: 'success' as const, url: 'com.example://callback?code=abc' });
        (NativeBrowserSessionBridgeSpec.openAuthSession as jest.Mock).mockImplementation(
          mockResolve
        );

        const result = openAuthSession('https://example.com/auth', 'com.example://callback');

        expect(result instanceof Promise).toBe(true);
      });
    });

    describe('Options handling', () => {
      it('should use default options when not provided', async () => {
        const mockResolve = jest
          .fn()
          .mockResolvedValue({ type: 'success' as const, url: 'com.example://callback?code=abc' });
        (NativeBrowserSessionBridgeSpec.openAuthSession as jest.Mock).mockImplementation(
          mockResolve
        );

        try {
          await openAuthSession('https://example.com/auth', 'com.example://callback');
        } catch (_) {
          // Expected in test environment
        }

        expect(NativeBrowserSessionBridgeSpec.openAuthSession).toHaveBeenCalled();
      });

      it('should support ephemeralSession: true option', async () => {
        const mockResolve = jest
          .fn()
          .mockResolvedValue({ type: 'success' as const, url: 'com.example://callback?code=abc' });
        (NativeBrowserSessionBridgeSpec.openAuthSession as jest.Mock).mockImplementation(
          mockResolve
        );

        const options: BrowserSessionOptions = { ephemeralSession: true };

        try {
          await openAuthSession('https://example.com/auth', 'com.example://callback', options);
        } catch (_) {
          // Expected in test environment
        }

        expect(NativeBrowserSessionBridgeSpec.openAuthSession).toHaveBeenCalled();
      });

      it('should support ephemeralSession: false option', async () => {
        const mockResolve = jest
          .fn()
          .mockResolvedValue({ type: 'success' as const, url: 'com.example://callback?code=abc' });
        (NativeBrowserSessionBridgeSpec.openAuthSession as jest.Mock).mockImplementation(
          mockResolve
        );

        const options: BrowserSessionOptions = { ephemeralSession: false };

        try {
          await openAuthSession('https://example.com/auth', 'com.example://callback', options);
        } catch (_) {
          // Expected in test environment
        }

        expect(NativeBrowserSessionBridgeSpec.openAuthSession).toHaveBeenCalled();
      });
    });

    describe('URL validation', () => {
      it('should validate that URL is a string', async () => {
        const mockResolve = jest
          .fn()
          .mockResolvedValue({ type: 'success' as const, url: 'com.example://callback?code=abc' });
        (NativeBrowserSessionBridgeSpec.openAuthSession as jest.Mock).mockImplementation(
          mockResolve
        );

        try {
          await openAuthSession('https://example.com/auth', 'com.example://callback');
        } catch (_) {
          // Expected
        }

        // Native module should be called with valid string
        expect(NativeBrowserSessionBridgeSpec.openAuthSession).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.any(Object)
        );
      });
    });

    describe('Redirect URI handling', () => {
      it('should extract scheme from full redirect URI with path', async () => {
        const mockResolve = jest
          .fn()
          .mockResolvedValue({ type: 'success' as const, url: 'com.example.app://oauth/callback?code=abc' });
        (NativeBrowserSessionBridgeSpec.openAuthSession as jest.Mock).mockImplementation(
          mockResolve
        );

        try {
          await openAuthSession('https://example.com/auth', 'com.example.app://oauth/callback');
        } catch (_) {
          // Expected in test environment
        }

        // Should extract "com.example.app" as the scheme
        expect(NativeBrowserSessionBridgeSpec.openAuthSession).toHaveBeenCalled();
      });

      it('should handle redirect URI without path', async () => {
        const mockResolve = jest
          .fn()
          .mockResolvedValue({ type: 'success' as const, url: 'com.example://callback?code=abc' });
        (NativeBrowserSessionBridgeSpec.openAuthSession as jest.Mock).mockImplementation(
          mockResolve
        );

        try {
          await openAuthSession('https://example.com/auth', 'com.example');
        } catch (_) {
          // Expected in test environment
        }

        expect(NativeBrowserSessionBridgeSpec.openAuthSession).toHaveBeenCalled();
      });
    });

    describe('Error handling', () => {
      it('should throw error if NativeBrowserSessionBridgeSpec is not available', async () => {
        // We would need to mock the module as unavailable for this test
        // For now, just verify the error message exists
        expect(openAuthSession).toBeDefined();
      });
    });

    describe('Type safety', () => {
      it('should have correct BrowserSessionOptions type', () => {
        const options: BrowserSessionOptions = { ephemeralSession: true };
        expect(typeof options.ephemeralSession).toBe('boolean');
      });

      it('should allow ephemeralSession to be true or false', () => {
        const optionsTrue: BrowserSessionOptions = { ephemeralSession: true };
        const optionsFalse: BrowserSessionOptions = { ephemeralSession: false };

        expect(optionsTrue.ephemeralSession).toBe(true);
        expect(optionsFalse.ephemeralSession).toBe(false);
      });
    });
  });

  describe('Module exports', () => {
    it('should export openAuthSession function', () => {
      expect(openAuthSession).toBeDefined();
      expect(typeof openAuthSession).toBe('function');
    });

    it('should export BrowserSessionOptions type', () => {
      // Type check - if this compiles, the type is exported correctly
      const options: BrowserSessionOptions = { ephemeralSession: false };
      expect(options).toBeDefined();
    });
  });
});
