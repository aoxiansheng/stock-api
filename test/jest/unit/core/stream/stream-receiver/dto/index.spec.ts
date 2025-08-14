import * as StreamReceiverDtoIndex from '../../../../../../../src/core/stream/stream-receiver/dto/index';
import { StreamSubscribeDto } from '../../../../../../../src/core/stream/stream-receiver/dto/stream-subscribe.dto';
import { StreamUnsubscribeDto } from '../../../../../../../src/core/stream/stream-receiver/dto/stream-unsubscribe.dto';

describe('Stream Receiver DTO Index', () => {
  it('should export StreamSubscribeDto', () => {
    expect(StreamReceiverDtoIndex.StreamSubscribeDto).toBeDefined();
    expect(StreamReceiverDtoIndex.StreamSubscribeDto).toBe(StreamSubscribeDto);
  });

  it('should export StreamUnsubscribeDto', () => {
    expect(StreamReceiverDtoIndex.StreamUnsubscribeDto).toBeDefined();
    expect(StreamReceiverDtoIndex.StreamUnsubscribeDto).toBe(StreamUnsubscribeDto);
  });

  it('should export all expected DTOs', () => {
    const expectedExports = ['StreamSubscribeDto', 'StreamUnsubscribeDto'];
    
    expectedExports.forEach(exportName => {
      expect(StreamReceiverDtoIndex[exportName]).toBeDefined();
    });
  });

  it('should not export undefined values', () => {
    Object.values(StreamReceiverDtoIndex).forEach(exportedValue => {
      expect(exportedValue).toBeDefined();
    });
  });

  it('should have all exports as constructors', () => {
    Object.values(StreamReceiverDtoIndex).forEach(exportedValue => {
      expect(typeof exportedValue).toBe('function');
    });
  });

  it('should support DTO instantiation', () => {
    expect(() => new StreamReceiverDtoIndex.StreamSubscribeDto()).not.toThrow();
    expect(() => new StreamReceiverDtoIndex.StreamUnsubscribeDto()).not.toThrow();
  });
});
