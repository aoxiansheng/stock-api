import { SHARED_ERROR_CODES, SharedErrorCode } from '@core/shared/constants/shared-error-codes.constants';

describe('Shared Error Codes Constants', () => {
  it('should be immutable const assertion', () => {
    expect(Object.isFrozen(SHARED_ERROR_CODES)).toBe(true);
  });

  it('should follow consistent error code format', () => {
    const errorCodePattern = /^SHARED_[A-Z]+_\d{3}$/;
    Object.values(SHARED_ERROR_CODES).forEach(code => {
      expect(code).toMatch(errorCodePattern);
    });
  });

  it('should categorize errors correctly by number ranges', () => {
    const validationCodes = Object.values(SHARED_ERROR_CODES).filter(code =>
      code.includes('VALIDATION') && parseInt(code.split('_')[2]) >= 1 && parseInt(code.split('_')[2]) <= 299
    );
    const businessCodes = Object.values(SHARED_ERROR_CODES).filter(code =>
      code.includes('BUSINESS') && parseInt(code.split('_')[2]) >= 300 && parseInt(code.split('_')[2]) <= 599
    );
    const systemCodes = Object.values(SHARED_ERROR_CODES).filter(code =>
      code.includes('SYSTEM') && parseInt(code.split('_')[2]) >= 600 && parseInt(code.split('_')[2]) <= 899
    );
    const externalCodes = Object.values(SHARED_ERROR_CODES).filter(code =>
      code.includes('EXTERNAL') && parseInt(code.split('_')[2]) >= 900 && parseInt(code.split('_')[2]) <= 999
    );

    expect(validationCodes.length).toBeGreaterThan(0);
    expect(businessCodes.length).toBeGreaterThan(0);
    expect(systemCodes.length).toBeGreaterThan(0);
    expect(externalCodes.length).toBeGreaterThan(0);
  });

  it('should support SharedErrorCode type', () => {
    const testCode: SharedErrorCode = SHARED_ERROR_CODES.INVALID_PATH_FORMAT;
    expect(testCode).toBe('SHARED_VALIDATION_001');
  });
});
