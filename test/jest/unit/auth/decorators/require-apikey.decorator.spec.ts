import { SetMetadata } from '@nestjs/common';
import { RequireApiKey, REQUIRE_API_KEY } from '@auth/decorators/require-apikey.decorator';

// Mock SetMetadata
jest.mock('@nestjs/common', () => ({
  SetMetadata: jest.fn(),
}));

describe('RequireApiKey Decorator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call SetMetadata with correct key and value', () => {
    const mockMetadataResult = 'mock-metadata-result';
    
    (SetMetadata as jest.Mock).mockReturnValue(mockMetadataResult);

    const result = RequireApiKey();

    expect(SetMetadata).toHaveBeenCalledWith(REQUIRE_API_KEY, true);
    expect(result).toBe(mockMetadataResult);
  });

  it('should maintain correct REQUIRE_API_KEY constant value', () => {
    expect(REQUIRE_API_KEY).toBe('requireApiKey');
  });
});