import { SetMetadata } from '@nestjs/common';
import { Public, IS_PUBLIC_KEY } from '@auth/decorators/public.decorator';

// Mock SetMetadata
jest.mock('@nestjs/common', () => ({
  SetMetadata: jest.fn(),
}));

describe('Public Decorator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call SetMetadata with correct key and value', () => {
    const mockMetadataResult = 'mock-metadata-result';
    
    (SetMetadata as jest.Mock).mockReturnValue(mockMetadataResult);

    const result = Public();

    expect(SetMetadata).toHaveBeenCalledWith(IS_PUBLIC_KEY, true);
    expect(result).toBe(mockMetadataResult);
  });

  it('should maintain correct IS_PUBLIC_KEY constant value', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });
});