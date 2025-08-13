/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  ResponseMetadataDto,
  DataResponseDto,
} from '../../../../../../../src/core/restapi/receiver/dto/data-response.dto';

describe('DataResponse DTOs', () => {

  describe('ResponseMetadataDto', () => {
    it('应能正确创建包含所有字段的实例', () => {
      const provider = 'test-provider';
      const capability = 'get-quote';
      const requestId = 'req-123';
      const processingTime = 50;
      const hasPartialFailures = true;
      const totalRequested = 10;
      const successfullyProcessed = 8;

      const metadata = new ResponseMetadataDto(
        provider, capability, requestId, processingTime, 
        hasPartialFailures, totalRequested, successfullyProcessed
      );

      expect(metadata.provider).toBe(provider);
      expect(metadata.capability).toBe(capability);
      expect(metadata.requestId).toBe(requestId);
      expect(metadata.processingTime).toBe(processingTime);
      expect(metadata.hasPartialFailures).toBe(hasPartialFailures);
      expect(metadata.totalRequested).toBe(totalRequested);
      expect(metadata.successfullyProcessed).toBe(successfullyProcessed);
      expect(typeof metadata.timestamp).toBe('string');
      expect(new Date(metadata.timestamp).toISOString()).toBe(metadata.timestamp);
    });

    it('当可选字段缺失时，应为 undefined', () => {
        const metadata = new ResponseMetadataDto('p', 'c', 'r', 10);
        expect(metadata.hasPartialFailures).toBeUndefined();
        expect(metadata.totalRequested).toBeUndefined();
        expect(metadata.successfullyProcessed).toBeUndefined();
    });
  });

  describe('DataResponseDto', () => {
    it('应能正确创建实例并赋值', () => {
      const data = { key: 'value' };
      const metadata = new ResponseMetadataDto('p', 'c', 'r', 10);
      const responseDto = new DataResponseDto(data, metadata);

      expect(responseDto.data).toBe(data);
      expect(responseDto.metadata).toBe(metadata);
    });

    it('应能处理不同类型的数据', () => {
        const metadata = new ResponseMetadataDto('p', 'c', 'r', 10);
        
        const arrayData = [1, 2, 3];
        const arrayResponse = new DataResponseDto(arrayData, metadata);
        expect(arrayResponse.data).toEqual(arrayData);

        const stringData = 'hello';
        const stringResponse = new DataResponseDto(stringData, metadata);
        expect(stringResponse.data).toBe(stringData);
      });
  });

});
