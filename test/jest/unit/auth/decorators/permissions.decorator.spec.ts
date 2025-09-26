import { SetMetadata } from '@nestjs/common';
import { RequirePermissions, PERMISSIONS_KEY } from '@auth/decorators/permissions.decorator';
import { Permission } from '@auth/enums/user-role.enum';

// Mock SetMetadata
jest.mock('@nestjs/common', () => ({
  SetMetadata: jest.fn(),
}));

describe('Permissions Decorator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call SetMetadata with correct key and single permission', () => {
    const mockPermission = Permission.DATA_READ;
    const mockMetadataResult = 'mock-metadata-result';
    
    (SetMetadata as jest.Mock).mockReturnValue(mockMetadataResult);

    const result = RequirePermissions(mockPermission);

    expect(SetMetadata).toHaveBeenCalledWith(PERMISSIONS_KEY, [mockPermission]);
    expect(result).toBe(mockMetadataResult);
  });

  it('should call SetMetadata with correct key and multiple permissions', () => {
    const permissions = [Permission.DATA_READ, Permission.DATA_WRITE, Permission.QUERY_EXECUTE];
    const mockMetadataResult = 'mock-metadata-result';
    
    (SetMetadata as jest.Mock).mockReturnValue(mockMetadataResult);

    const result = RequirePermissions(...permissions);

    expect(SetMetadata).toHaveBeenCalledWith(PERMISSIONS_KEY, permissions);
    expect(result).toBe(mockMetadataResult);
  });

  it('should handle empty permissions array', () => {
    const permissions: Permission[] = [];
    const mockMetadataResult = 'mock-metadata-result';
    
    (SetMetadata as jest.Mock).mockReturnValue(mockMetadataResult);

    const result = RequirePermissions(...permissions);

    expect(SetMetadata).toHaveBeenCalledWith(PERMISSIONS_KEY, permissions);
    expect(result).toBe(mockMetadataResult);
  });

  it('should handle all Permission enum values', () => {
    const allPermissions = Object.values(Permission);
    const mockMetadataResult = 'mock-metadata-result';
    
    (SetMetadata as jest.Mock).mockReturnValue(mockMetadataResult);

    const result = RequirePermissions(...allPermissions);

    expect(SetMetadata).toHaveBeenCalledWith(PERMISSIONS_KEY, allPermissions);
    expect(result).toBe(mockMetadataResult);
  });

  it('should maintain correct PERMISSIONS_KEY constant value', () => {
    expect(PERMISSIONS_KEY).toBe('permissions');
  });
});