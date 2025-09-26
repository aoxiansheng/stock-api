import { SetMetadata } from '@nestjs/common';
import { Roles, ROLES_KEY } from '@auth/decorators/roles.decorator';
import { UserRole } from '@auth/enums/user-role.enum';

// Mock SetMetadata
jest.mock('@nestjs/common', () => ({
  SetMetadata: jest.fn(),
}));

describe('Roles Decorator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call SetMetadata with correct key and single role', () => {
    const mockRole = UserRole.ADMIN;
    const mockMetadataResult = 'mock-metadata-result';
    
    (SetMetadata as jest.Mock).mockReturnValue(mockMetadataResult);

    const result = Roles(mockRole);

    expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, [mockRole]);
    expect(result).toBe(mockMetadataResult);
  });

  it('should call SetMetadata with correct key and multiple roles', () => {
    const roles = [UserRole.ADMIN, UserRole.DEVELOPER];
    const mockMetadataResult = 'mock-metadata-result';

    (SetMetadata as jest.Mock).mockReturnValue(mockMetadataResult);

    const result = Roles(...roles);

    expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, roles);
    expect(result).toBe(mockMetadataResult);
  });

  it('should handle empty roles array', () => {
    const roles: UserRole[] = [];
    const mockMetadataResult = 'mock-metadata-result';
    
    (SetMetadata as jest.Mock).mockReturnValue(mockMetadataResult);

    const result = Roles(...roles);

    expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, roles);
    expect(result).toBe(mockMetadataResult);
  });

  it('should handle all UserRole enum values', () => {
    const allRoles = Object.values(UserRole);
    const mockMetadataResult = 'mock-metadata-result';
    
    (SetMetadata as jest.Mock).mockReturnValue(mockMetadataResult);

    const result = Roles(...allRoles);

    expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, allRoles);
    expect(result).toBe(mockMetadataResult);
  });

  it('should maintain correct ROLES_KEY constant value', () => {
    expect(ROLES_KEY).toBe('roles');
  });
});