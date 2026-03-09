import { PlatformRegistry } from 'src/platform/Platform';
import { __internalTimeCoordinator, TimeCoordinator, Timestamp } from 'src/utils/TimeCoordinator';
import { __internalDPoPSigningAuthority } from 'src/oauth2/dpop';


describe('PlatformRegistry', () => {
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

  describe('exports / entry files', () => {
    describe('default export (index.ts)', () => {
      it('exposes public API and defines default platform dependencies', async () => {
        const module = (await import('src/index'));
        expect(module).toMatchObject({
          Credential: expect.any(Function),
          OAuth2Client: expect.any(Function),
          TokenOrchestrator: expect.any(Function),
          FetchClient: expect.any(Function),
        });
        expect(() => module.Platform.TimeCoordinator).not.toThrow();
        expect(() => module.Platform.DPoPSigningAuthority).not.toThrow();
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
        expect(() => module.Platform.TimeCoordinator).toThrow(PlatformModule.PlatformRegistryError);
        expect(() => module.Platform.DPoPSigningAuthority).toThrow(PlatformModule.PlatformRegistryError);

        module.Platform.registerDefaultsLoader(() => ({
          TimeCoordinator: __internalTimeCoordinator,
          DPoPSigningAuthority: __internalDPoPSigningAuthority
        }));

        expect(() => module.Platform.TimeCoordinator).not.toThrow();
        expect(() => module.Platform.DPoPSigningAuthority).not.toThrow();
      });
    });
  });

  describe('Override capabilities', () => {
    class CustomTimeCoordinator implements TimeCoordinator {
      clockSkew: number = 100;
      clockTolerance: number = 100;
      now () { return Timestamp.from(1000); }
    }

    it('enables the default dependency implementation to be overwritten', () => {
      expect(() => Platform.TimeCoordinator).toThrow(PlatformModule.PlatformRegistryError);
      expect(() => Platform.DPoPSigningAuthority).toThrow(PlatformModule.PlatformRegistryError);

      Platform.registerDefaultsLoader(() => ({
        TimeCoordinator: __internalTimeCoordinator,
        DPoPSigningAuthority: __internalDPoPSigningAuthority
      }));

      expect(Platform.TimeCoordinator).toEqual(__internalTimeCoordinator);
      expect(Platform.DPoPSigningAuthority).toEqual(__internalDPoPSigningAuthority);

      const CustomizedTimeCoordinator = new CustomTimeCoordinator();
      Platform.configure({
        TimeCoordinator: CustomizedTimeCoordinator
      });

      expect(Platform.TimeCoordinator).toEqual(CustomizedTimeCoordinator);
      expect(Platform.DPoPSigningAuthority).toEqual(__internalDPoPSigningAuthority);

      expect(__internalTimeCoordinator.now()).not.toEqual(CustomizedTimeCoordinator.now());
    });
  });
});