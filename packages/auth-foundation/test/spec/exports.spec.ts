import { PlatformRegistry } from 'src/platform/Platform';


describe('exports', () => {
  let PlatformModule;
  let Platform: PlatformRegistry;

  beforeEach(async () => {
    PlatformModule = (await import('src/platform/Platform'));
    Platform = PlatformModule.Platform;
  });
  
  afterEach(() => {
    jest.resetModules();
  });

  describe('PlatformRegistry', () => {
    it('exports an instance of PlatformRegistry', () => {
      expect(Platform).toBeInstanceOf(PlatformRegistry);
    });

    it('should throw if no default loader has been registered', () => {
      expect(() => Platform.TimeCoordinator).toThrow(PlatformModule.PlatformRegistryError);
    });
  });

  describe('default export (index.ts)', () => {
    it('exposes public API and defines default platform dependencies', async () => {
      const module = (await import('src/index'));
      expect(module).toMatchObject({
        Credential: expect.any(Function),
        OAuth2Client: expect.any(Function),
        TokenOrchestrator: expect.any(Function),
        FetchClient: expect.any(Function),
      });
      expect(() => Platform.TimeCoordinator).not.toThrow();
      expect(() => Platform.DPoPSigningAuthority).not.toThrow();
    });
  });

  describe('core export (core.ts)', () => {
    it('exposes public API and does NOT provide default platform dependencies', async () => {
      const module = (await import('src/core'));
      expect(module).toMatchObject({
        Credential: expect.any(Function),
        OAuth2Client: expect.any(Function),
        TokenOrchestrator: expect.any(Function),
        FetchClient: expect.any(Function),
      });
      expect(() => Platform.TimeCoordinator).toThrow(PlatformModule.PlatformRegistryError);
      expect(() => Platform.DPoPSigningAuthority).toThrow(PlatformModule.PlatformRegistryError);
    });
  });
});