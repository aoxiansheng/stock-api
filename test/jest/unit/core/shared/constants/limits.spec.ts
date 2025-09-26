import { CORE_LIMITS } from '@core/shared/constants/limits';

describe('Core Limits Constants', () => {
  it('should be frozen for immutability', () => {
    expect(Object.isFrozen(CORE_LIMITS)).toBe(true);
  });

  describe('STRING_LENGTH limits', () => {
    it('should have logical length hierarchy', () => {
      const { STRING_LENGTH } = CORE_LIMITS;
      expect(STRING_LENGTH.MIN_LENGTH).toBeLessThan(STRING_LENGTH.SHORT_MAX_LENGTH);
      expect(STRING_LENGTH.SHORT_MAX_LENGTH).toBeLessThan(STRING_LENGTH.MEDIUM_MAX_LENGTH);
      expect(STRING_LENGTH.MEDIUM_MAX_LENGTH).toBeLessThan(STRING_LENGTH.LONG_MAX_LENGTH);
      expect(STRING_LENGTH.LONG_MAX_LENGTH).toBeLessThan(STRING_LENGTH.EXTRA_LONG_MAX_LENGTH);
    });

    it('should have reasonable length values', () => {
      const { STRING_LENGTH } = CORE_LIMITS;
      expect(STRING_LENGTH.EMAIL_MAX_LENGTH).toBe(255);
      expect(STRING_LENGTH.URL_MAX_LENGTH).toBe(2048);
      expect(STRING_LENGTH.PHONE_MAX_LENGTH).toBe(20);
    });
  });

  describe('ID_LENGTH limits', () => {
    it('should have standard ID lengths', () => {
      const { ID_LENGTH } = CORE_LIMITS;
      expect(ID_LENGTH.UUID_LENGTH).toBe(36);
      expect(ID_LENGTH.MONGODB_ID_LENGTH).toBe(24);
      expect(ID_LENGTH.SHORTID_LENGTH).toBe(12);
    });
  });

  describe('BATCH_LIMITS', () => {
    it('should have logical batch size hierarchy', () => {
      const { BATCH_LIMITS } = CORE_LIMITS;
      expect(BATCH_LIMITS.MIN_BATCH_SIZE).toBeLessThan(BATCH_LIMITS.DEFAULT_BATCH_SIZE);
      expect(BATCH_LIMITS.DEFAULT_BATCH_SIZE).toBeLessThan(BATCH_LIMITS.MAX_BATCH_SIZE);
    });
  });

  describe('PAGINATION', () => {
    it('should have reasonable pagination limits', () => {
      const { PAGINATION } = CORE_LIMITS;
      expect(PAGINATION.MIN_PAGE_SIZE).toBe(1);
      expect(PAGINATION.DEFAULT_PAGE_SIZE).toBe(20);
      expect(PAGINATION.MAX_PAGE_SIZE).toBe(100);
    });
  });

  describe('SECURITY', () => {
    it('should have secure password requirements', () => {
      const { SECURITY } = CORE_LIMITS;
      expect(SECURITY.PASSWORD_MIN_LENGTH).toBe(8);
      expect(SECURITY.MAX_LOGIN_ATTEMPTS).toBe(5);
      expect(SECURITY.TOKEN_MIN_LENGTH).toBe(32);
    });
  });
});
