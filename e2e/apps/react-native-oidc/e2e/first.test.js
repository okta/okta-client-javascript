describe("Smoke", () => {
  it("should launch", async () => {
    await device.launchApp({ newInstance: true });
    await expect(element(by.text("Log in"))).toBeVisible();
  });
});
