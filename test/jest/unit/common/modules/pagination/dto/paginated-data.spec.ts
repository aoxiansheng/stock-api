/* eslint-disable @typescript-eslint/no-unused-vars */

import { PaginatedDataDto } from "../../../../../../../src/common/modules/pagination/dto/paginated-data";

describe("PaginatedDataDto", () => {
  // 测试构造函数是否正确初始化属性
  it("should correctly initialize items and pagination properties", () => {
    // 模拟数据项
    const mockItems = [
      { id: 1, name: "Test1" },
      { id: 2, name: "Test2" },
    ];
    // 模拟分页信息
    const mockPagination = {
      page: 1,
      limit: 10,
      total: 20,
      totalPages: 2,
      hasNext: true,
      hasPrev: false,
    };

    // 创建 PaginatedDataDto 实例
    const paginatedData = new PaginatedDataDto(mockItems, mockPagination);

    // 断言 items 属性是否正确
    expect(paginatedData.items).toEqual(mockItems);
    // 断言 pagination 属性是否正确
    expect(paginatedData.pagination).toEqual(mockPagination);
  });

  // 测试当 items 为空数组时的情况
  it("should handle empty items array correctly", () => {
    // 模拟空数据项
    const mockItems: any[] = [];
    // 模拟分页信息
    const mockPagination = {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    };

    // 创建 PaginatedDataDto 实例
    const paginatedData = new PaginatedDataDto(mockItems, mockPagination);

    // 断言 items 属性是否为空数组
    expect(paginatedData.items).toEqual([]);
    // 断言 pagination 属性是否正确
    expect(paginatedData.pagination).toEqual(mockPagination);
  });
});
