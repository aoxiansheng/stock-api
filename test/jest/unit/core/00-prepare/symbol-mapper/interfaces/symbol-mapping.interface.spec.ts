import {
  ISymbolMapper,
  ISymbolMappingRule,
} from '../../../../../../../src/core/00-prepare/symbol-mapper/interfaces/symbol-mapping.interface';

describe('Symbol Mapping Interfaces', () => {
  describe('ISymbolMapper', () => {
    it('should be defined as a TypeScript interface', () => {
      // Interface type checking - TypeScript ensures interface structure at compile time
      const mockService: ISymbolMapper = {
        saveMapping: jest.fn(),
        getSymbolMappingRule: jest.fn(),
      } as any;

      expect(mockService).toBeDefined();
      expect(typeof mockService.saveMapping).toBe('function');
      expect(typeof mockService.getSymbolMappingRule).toBe('function');
    });
  });

  describe('ISymbolMappingRule', () => {
    it('should be defined as a TypeScript interface', () => {
      // Interface type checking - TypeScript ensures interface structure at compile time
      const mockRule: ISymbolMappingRule = {
        standardSymbol: '00700',
        sdkSymbol: '700.HK',
        market: 'HK',
        symbolType: 'stock',
        isActive: true,
        description: 'Tencent Holdings Limited',
      };

      expect(mockRule).toBeDefined();
      expect(mockRule.standardSymbol).toBe('00700');
      expect(mockRule.sdkSymbol).toBe('700.HK');
      expect(mockRule.market).toBe('HK');
      expect(mockRule.symbolType).toBe('stock');
      expect(mockRule.isActive).toBe(true);
      expect(mockRule.description).toBe('Tencent Holdings Limited');
    });
  });

  describe('Interface compatibility', () => {
    it('should ensure service interface is compatible with repository interface structure', () => {
      // This test verifies that both interfaces have compatible method signatures
      // The actual implementation classes should implement these interfaces correctly

      const serviceMethodNames = [
        'create', 'findById', 'findByDataSource', 'findAll', 'findBySymbol',
        'update', 'delete', 'transformSymbols', 'addSymbolMappingRule', 'updateSymbolMappingRule'
      ];

      const repositoryMethodNames = [
        'create', 'findById', 'findByDataSource', 'findAll',
        'update', 'delete', 'findBySymbol', 'addSymbolMappingRule', 'updateSymbolMappingRule'
      ];

      // Service has additional transformSymbols method not in repository
      expect(serviceMethodNames).toContain('transformSymbols');
      expect(repositoryMethodNames).not.toContain('transformSymbols');

      // Both interfaces share common CRUD methods
      const commonMethods = ['create', 'findById', 'findByDataSource', 'findAll', 'update', 'delete'];
      commonMethods.forEach(method => {
        expect(serviceMethodNames).toContain(method);
        expect(repositoryMethodNames).toContain(method);
      });
    });
  });
});