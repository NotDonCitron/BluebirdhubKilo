import '@testing-library/jest-dom';
describe('Test Setup', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have jest environment configured', () => {
    expect(typeof window).toBe('object');
  });

  it('should have mocks configured', () => {
    expect(jest).toBeDefined();
  });
});