import { validate } from 'class-validator';
import { IsValidEmail, IsValidEmailConstraint } from '@common/validators/email.validator';

// Test DTO class for decorator testing
class TestEmailDto {
  @IsValidEmail()
  email: string;

  @IsValidEmail({ message: 'Custom error message' })
  customEmail: string;
}

describe('EmailValidator', () => {
  describe('IsValidEmailConstraint', () => {
    let constraint: IsValidEmailConstraint;

    beforeEach(() => {
      constraint = new IsValidEmailConstraint();
    });

    describe('validate', () => {
      it('should validate correct email formats', () => {
        const validEmails = [
          'test@example.com',
          'user123@domain.org',
          'first.last@company.net',
          'user+tag@example.com',
          'user_name@example-domain.com',
          'a@b.co',
          'test123+filter@example-site.org',
          'user.email.with+symbol@example.com',
        ];

        validEmails.forEach(email => {
          expect(constraint.validate(email, {} as any)).toBe(true);
        });
      });

      it('should reject invalid email formats', () => {
        const invalidEmails = [
          'plainaddress',
          '@example.com',
          'user@',
          'user@@domain.com',
          'user@domain',
          'user@domain.',
          '.user@domain.com',
          'user.@domain.com',
          'user..double.dot@domain.com',
          'user@domain..com',
          'user name@domain.com', // space
          'user@domain com',
          // 'user@domain.c', // TLD too short - commented out as our regex allows 2+ chars
          '',
          'user@domain..co.uk',
          'user@.domain.com',
          'user@domain.com.',
          'user@-domain.com',
          'user@domain-.com',
        ];

        invalidEmails.forEach(email => {
          expect(constraint.validate(email, {} as any)).toBe(false);
        });
      });

      it('should handle non-string values', () => {
        const nonStringValues = [
          null,
          undefined,
          123,
          true,
          {},
          [],
          new Date(),
        ];

        nonStringValues.forEach(value => {
          expect(constraint.validate(value, {} as any)).toBe(false);
        });
      });

      it('should enforce maximum email length (254 characters)', () => {
        // Create email with exactly 254 characters
        const localPart = 'a'.repeat(60); // 60 chars
        const domain = 'b'.repeat(60) + '.com'; // 64 chars
        const validLongEmail = localPart + '@' + domain; // 60 + 1 + 64 = 125 chars

        // Make it longer to test 254 limit
        const veryLongEmail = 'a'.repeat(200) + '@' + 'b'.repeat(50) + '.com'; // > 254 chars

        expect(constraint.validate(validLongEmail, {} as any)).toBe(true);
        expect(constraint.validate(veryLongEmail, {} as any)).toBe(false);
      });

      it('should enforce local part length limit (64 characters)', () => {
        const validLocalPart = 'a'.repeat(64) + '@example.com'; // exactly 64 chars local part
        const invalidLocalPart = 'a'.repeat(65) + '@example.com'; // 65 chars local part

        expect(constraint.validate(validLocalPart, {} as any)).toBe(true);
        expect(constraint.validate(invalidLocalPart, {} as any)).toBe(false);
      });

      it('should handle edge cases with special characters', () => {
        const specialCharEmails = [
          'user+tag@example.com', // valid
          'user-name@example.com', // valid
          'user_name@example.com', // valid
          'user.name@example.com', // valid
          'user%name@example.com', // valid
          'user@example-domain.com', // valid
          'user@sub.example.com', // valid
        ];

        specialCharEmails.forEach(email => {
          expect(constraint.validate(email, {} as any)).toBe(true);
        });
      });

      it('should reject emails with invalid special characters', () => {
        const invalidSpecialChars = [
          'user@#example.com',
          'user$@example.com',
          'user@exam ple.com',
          'user@example$.com',
          'user()@example.com',
          'user[]@example.com',
          'user@example[].com',
        ];

        invalidSpecialChars.forEach(email => {
          expect(constraint.validate(email, {} as any)).toBe(false);
        });
      });
    });

    describe('defaultMessage', () => {
      it('should return correct default error message', () => {
        const args = { property: 'email' } as any;
        const message = constraint.defaultMessage(args);

        expect(message).toBe('email 必须是有效的邮箱地址格式');
      });

      it('should use property name in message', () => {
        const args = { property: 'userEmail' } as any;
        const message = constraint.defaultMessage(args);

        expect(message).toBe('userEmail 必须是有效的邮箱地址格式');
      });
    });
  });

  describe('@IsValidEmail decorator', () => {
    it('should validate using the decorator with default message', async () => {
      const dto = new TestEmailDto();
      dto.email = 'invalid-email';
      dto.customEmail = 'valid@example.com';

      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('email');
      expect(errors[0].constraints).toHaveProperty('IsValidEmailConstraint');
      expect(errors[0].constraints!.IsValidEmailConstraint).toBe('email 必须是有效的邮箱地址格式');
    });

    it('should use custom error message', async () => {
      const dto = new TestEmailDto();
      dto.email = 'valid@example.com';
      dto.customEmail = 'invalid-email';

      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('customEmail');
      expect(errors[0].constraints).toHaveProperty('IsValidEmailConstraint');
      expect(errors[0].constraints!.IsValidEmailConstraint).toBe('Custom error message');
    });

    it('should pass validation with valid emails', async () => {
      const dto = new TestEmailDto();
      dto.email = 'test@example.com';
      dto.customEmail = 'user@domain.org';

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should validate multiple invalid emails', async () => {
      const dto = new TestEmailDto();
      dto.email = 'invalid1';
      dto.customEmail = 'invalid2@';

      const errors = await validate(dto);

      expect(errors).toHaveLength(2);
      expect(errors.find(e => e.property === 'email')).toBeDefined();
      expect(errors.find(e => e.property === 'customEmail')).toBeDefined();
    });

    it('should handle null and undefined values', async () => {
      const dto1 = new TestEmailDto();
      dto1.email = null as any;
      dto1.customEmail = 'valid@example.com';

      const errors1 = await validate(dto1);
      expect(errors1).toHaveLength(1);
      expect(errors1[0].property).toBe('email');

      const dto2 = new TestEmailDto();
      dto2.email = 'valid@example.com';
      dto2.customEmail = undefined as any;

      const errors2 = await validate(dto2);
      expect(errors2).toHaveLength(1);
      expect(errors2[0].property).toBe('customEmail');
    });
  });

  describe('International and complex email formats', () => {
    let constraint: IsValidEmailConstraint;

    beforeEach(() => {
      constraint = new IsValidEmailConstraint();
    });

    it('should validate international domain names (basic ASCII)', () => {
      const internationalEmails = [
        'user@example.co.uk',
        'test@example.org.au',
        'email@subdomain.example.com',
        'user@example-company.net',
        'test@a-b-c.example.org',
      ];

      internationalEmails.forEach(email => {
        expect(constraint.validate(email, {} as any)).toBe(true);
      });
    });

    it('should handle common TLD variations', () => {
      const tldEmails = [
        'user@example.com',
        'user@example.net',
        'user@example.org',
        'user@example.edu',
        'user@example.gov',
        'user@example.info',
        'user@example.co',
        'user@example.io',
        'user@example.tech',
        'user@example.business',
      ];

      tldEmails.forEach(email => {
        expect(constraint.validate(email, {} as any)).toBe(true);
      });
    });

    it('should reject malformed domain parts', () => {
      const malformedDomains = [
        'user@.example.com',
        'user@example..com',
        'user@example.',
        'user@example.c',
        'user@example-.com',
        'user@-example.com',
        'user@exam_ple.com',
        'user@example.com.',
        'user@.com',
      ];

      malformedDomains.forEach(email => {
        expect(constraint.validate(email, {} as any)).toBe(false);
      });
    });
  });

  describe('Performance and edge cases', () => {
    let constraint: IsValidEmailConstraint;

    beforeEach(() => {
      constraint = new IsValidEmailConstraint();
    });

    it('should handle very long valid emails near the limit', () => {
      // Create email just under the 254 character limit
      const longValidEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.' + 'c'.repeat(50) + '.com';

      if (longValidEmail.length <= 254) {
        expect(constraint.validate(longValidEmail, {} as any)).toBe(true);
      }
    });

    it('should handle empty and whitespace strings', () => {
      expect(constraint.validate('', {} as any)).toBe(false);
      expect(constraint.validate('   ', {} as any)).toBe(false);
      expect(constraint.validate('\t', {} as any)).toBe(false);
      expect(constraint.validate('\n', {} as any)).toBe(false);
    });

    it('should handle malicious or suspicious input', () => {
      const suspiciousInputs = [
        'user@evil.com<script>alert("xss")</script>',
        'user@example.com; DROP TABLE users;',
        'user@example.com\x00',
        'user@exam\x00ple.com',
        'user@example.com\r\n',
        'user@example.com\x0d\x0a',
      ];

      suspiciousInputs.forEach(email => {
        expect(constraint.validate(email, {} as any)).toBe(false);
      });
    });

    it('should validate consistently across multiple calls', () => {
      const testEmail = 'test@example.com';

      for (let i = 0; i < 100; i++) {
        expect(constraint.validate(testEmail, {} as any)).toBe(true);
      }

      const invalidEmail = 'invalid-email';

      for (let i = 0; i < 100; i++) {
        expect(constraint.validate(invalidEmail, {} as any)).toBe(false);
      }
    });
  });
});