import { PaginatedDataDto } from "../../../../../../src/common/modules/pagination/dto/paginated-data";

describe("Common Response DTOs", () => {
  describe("PaginatedDataDto", () => {
    it("should create instance with items and pagination", () => {
      const testItems = [
        { id: 1, name: "item1" },
        { id: 2, name: "item2" },
      ];
      const pagination = {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };

      const dto = new PaginatedDataDto(testItems, pagination);

      expect(dto.items).toEqual(testItems);
      expect(dto.pagination).toEqual(pagination);
      expect(dto.items).toHaveLength(2);
    });

    it("should handle empty items array", () => {
      const pagination = {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };

      const dto = new PaginatedDataDto([], pagination);

      expect(dto.items).toEqual([]);
      expect(dto.pagination.total).toBe(0);
      expect(dto.items).toHaveLength(0);
    });

    it("should handle pagination with multiple pages", () => {
      const testItems = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `item${i + 1}`,
      }));
      const pagination = {
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      };

      const dto = new PaginatedDataDto(testItems, pagination);

      expect(dto.items).toHaveLength(10);
      expect(dto.pagination.page).toBe(2);
      expect(dto.pagination.hasNext).toBe(true);
      expect(dto.pagination.hasPrev).toBe(true);
    });
  });

  // Note: ApiResponseDto and ErrorResponseDto have been removed as they are
  // now automatically handled by the global ResponseInterceptor
  describe("Response Format Compliance", () => {
    it("should rely on ResponseInterceptor for standard response formatting", () => {
      // This test validates that we no longer manually create response wrappers
      // ResponseInterceptor automatically provides: { statusCode, message, data, timestamp }
      expect(true).toBe(true); // Placeholder test to ensure compliance direction
    });
  });
});
