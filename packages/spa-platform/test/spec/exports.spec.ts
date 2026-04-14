describe('Exports ', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.unmock('@okta/oauth2-flows');
  });

  it('core exports work without oauth2-flows installed', async () => {
    // Mock the missing optional dependency
    jest.doMock('@okta/oauth2-flows', () => {
      throw new Error('Cannot find module @okta/oauth2-flows');
    });

    const coreModule = await import('../../src/core');
    expect(coreModule).toBeDefined();
    expect(coreModule.OAuth2Client).toBeDefined();
    expect(coreModule.FetchClient).toBeDefined();
  });
  
  it('flows export requires oauth2-flows', async () => {
    // mocks missing optional dependency
    jest.doMock('@okta/oauth2-flows', () => {
      throw new Error('Cannot find module @okta/oauth2-flows');
    });

    await expect(import('../../src/flows')).rejects.toThrow(/Cannot find module @okta\/oauth2-flows/);
  });

  it('flows export works when oauth2-flows is installed', async () => {
    jest.resetModules();

    jest.doMock('@okta/oauth2-flows', () => {
      return jest.requireActual('@okta/oauth2-flows');
    });

    const flowsModule = await import('../../src/flows');
    expect(flowsModule).toBeDefined();

    expect(flowsModule.OAuth2Client).toBeDefined();
    expect(flowsModule.FetchClient).toBeDefined();
    expect(flowsModule.AuthorizationCodeFlowOrchestrator).toBeDefined();
  });

  it('default export (index) works without oauth2-flows installed', async () => {
    jest.doMock('@okta/oauth2-flows', () => {
      throw new Error('Cannot find module @okta/oauth2-flows');
    });

    const indexModule = await import('../../src/index');
    expect(indexModule).toBeDefined();
    expect(indexModule.OAuth2Client).toBeDefined();
    expect(indexModule.FetchClient).toBeDefined();
    expect((indexModule as any).AuthorizationCodeFlowOrchestrator).toBeUndefined();
  });
});