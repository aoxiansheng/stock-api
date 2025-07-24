import { RedisUtils } from '../../../../../../src/core/storage/utils/redis.util';

describe('RedisUtils', () => {
  describe('extractValueFromInfo', () => {
    describe('valid Redis INFO format', () => {
      it('should extract simple key-value pairs', () => {
        const info = 'used_memory:1048576\nexpired_keys:0\ntotal_commands:1000';
        
        expect(RedisUtils.extractValueFromInfo(info, 'used_memory')).toBe('1048576');
        expect(RedisUtils.extractValueFromInfo(info, 'expired_keys')).toBe('0');
        expect(RedisUtils.extractValueFromInfo(info, 'total_commands')).toBe('1000');
      });

      it('should handle keys with underscores and numbers', () => {
        const info = 'db0:keys=100,expires=50,avg_ttl=3600\ndb1:keys=200,expires=100';
        
        expect(RedisUtils.extractValueFromInfo(info, 'db0')).toBe('keys=100,expires=50,avg_ttl=3600');
        expect(RedisUtils.extractValueFromInfo(info, 'db1')).toBe('keys=200,expires=100');
      });

      it('should handle values with special characters', () => {
        const info = 'redis_version:6.2.7\nconfig_file:/etc/redis/redis.conf\nprocess_id:1234';
        
        expect(RedisUtils.extractValueFromInfo(info, 'redis_version')).toBe('6.2.7');
        expect(RedisUtils.extractValueFromInfo(info, 'config_file')).toBe('/etc/redis/redis.conf');
        expect(RedisUtils.extractValueFromInfo(info, 'process_id')).toBe('1234');
      });

      it('should handle multi-line values with complex data', () => {
        const info = `# Memory
used_memory:1048576
used_memory_human:1.00M
used_memory_rss:2097152
# Stats  
total_connections_received:1000
total_commands_processed:5000`;

        expect(RedisUtils.extractValueFromInfo(info, 'used_memory')).toBe('1048576');
        expect(RedisUtils.extractValueFromInfo(info, 'used_memory_human')).toBe('1.00M');
        expect(RedisUtils.extractValueFromInfo(info, 'used_memory_rss')).toBe('2097152');
        expect(RedisUtils.extractValueFromInfo(info, 'total_connections_received')).toBe('1000');
        expect(RedisUtils.extractValueFromInfo(info, 'total_commands_processed')).toBe('5000');
      });

      it('should handle values with spaces and colons', () => {
        const info = 'loading:0\nrdb_last_save_time:1678901234\nrole:master';
        
        expect(RedisUtils.extractValueFromInfo(info, 'loading')).toBe('0');
        expect(RedisUtils.extractValueFromInfo(info, 'rdb_last_save_time')).toBe('1678901234');
        expect(RedisUtils.extractValueFromInfo(info, 'role')).toBe('master');
      });

      it('should handle empty values', () => {
        const info = 'empty_key:\nvalid_key:value\nanother_empty:';
        
        expect(RedisUtils.extractValueFromInfo(info, 'empty_key')).toBe('');
        expect(RedisUtils.extractValueFromInfo(info, 'valid_key')).toBe('value');
        expect(RedisUtils.extractValueFromInfo(info, 'another_empty')).toBe('');
      });

      it('should handle Windows-style line endings', () => {
        const info = 'key1:value1\r\nkey2:value2\r\nkey3:value3';
        
        expect(RedisUtils.extractValueFromInfo(info, 'key1')).toBe('value1');
        expect(RedisUtils.extractValueFromInfo(info, 'key2')).toBe('value2');
        expect(RedisUtils.extractValueFromInfo(info, 'key3')).toBe('value3');
      });
    });

    describe('missing keys', () => {
      it('should return null for non-existent keys', () => {
        const info = 'existing_key:value\nanother_key:another_value';
        
        expect(RedisUtils.extractValueFromInfo(info, 'missing_key')).toBeNull();
        expect(RedisUtils.extractValueFromInfo(info, 'not_found')).toBeNull();
      });

      it('should return null for partial key matches', () => {
        const info = 'used_memory:1048576\nused_memory_human:1.00M';
        
        // Should not match partial keys
        expect(RedisUtils.extractValueFromInfo(info, 'used')).toBeNull();
        expect(RedisUtils.extractValueFromInfo(info, 'memory')).toBeNull();
        expect(RedisUtils.extractValueFromInfo(info, 'used_memory_')).toBeNull();
      });

      it('should be case sensitive', () => {
        const info = 'CaseSensitive:value\nlowercase:value2';
        
        expect(RedisUtils.extractValueFromInfo(info, 'CaseSensitive')).toBe('value');
        expect(RedisUtils.extractValueFromInfo(info, 'casesensitive')).toBeNull();
        expect(RedisUtils.extractValueFromInfo(info, 'CASESENSITIVE')).toBeNull();
        expect(RedisUtils.extractValueFromInfo(info, 'lowercase')).toBe('value2');
        expect(RedisUtils.extractValueFromInfo(info, 'LOWERCASE')).toBeNull();
      });
    });

    describe('invalid/empty inputs', () => {
      it('should handle empty info string', () => {
        expect(RedisUtils.extractValueFromInfo('', 'any_key')).toBeNull();
      });

      it('should handle empty key string', () => {
        const info = 'valid_key:value';
        expect(RedisUtils.extractValueFromInfo(info, '')).toBeNull();
      });

      it('should handle null/undefined inputs gracefully', () => {
        expect(RedisUtils.extractValueFromInfo(null as any, 'key')).toBeNull();
        expect(RedisUtils.extractValueFromInfo(undefined as any, 'key')).toBeNull();
        expect(RedisUtils.extractValueFromInfo('info', null as any)).toBeNull();
        expect(RedisUtils.extractValueFromInfo('info', undefined as any)).toBeNull();
      });

      it('should handle malformed INFO strings', () => {
        const malformedInfo = 'no_colon_here\nvalid_key:value\ninvalid_line_without_colon';
        
        expect(RedisUtils.extractValueFromInfo(malformedInfo, 'no_colon_here')).toBeNull();
        expect(RedisUtils.extractValueFromInfo(malformedInfo, 'valid_key')).toBe('value');
        expect(RedisUtils.extractValueFromInfo(malformedInfo, 'invalid_line_without_colon')).toBeNull();
      });

      it('should handle info string with only whitespace', () => {
        expect(RedisUtils.extractValueFromInfo('   \n  \t  \n  ', 'key')).toBeNull();
      });
    });

    describe('edge cases with special characters', () => {
      it('should handle keys with special regex characters', () => {
        const info = 'key.with.dots:value1\nkey$with$dollars:value2\nkey[with]brackets:value3';
        
        expect(RedisUtils.extractValueFromInfo(info, 'key.with.dots')).toBe('value1');
        expect(RedisUtils.extractValueFromInfo(info, 'key$with$dollars')).toBe('value2');
        expect(RedisUtils.extractValueFromInfo(info, 'key[with]brackets')).toBe('value3');
      });

      it('should handle values with multiple colons', () => {
        const info = 'time_stamp:2023:03:15:14:30:00\nurl:http://example.com:8080';
        
        expect(RedisUtils.extractValueFromInfo(info, 'time_stamp')).toBe('2023:03:15:14:30:00');
        expect(RedisUtils.extractValueFromInfo(info, 'url')).toBe('http://example.com:8080');
      });

      it('should handle Unicode characters in values', () => {
        const info = 'chinese_text:你好世界\nemoji_value:🚀✨🎉\nspecial_chars:áéíóú';
        
        expect(RedisUtils.extractValueFromInfo(info, 'chinese_text')).toBe('你好世界');
        expect(RedisUtils.extractValueFromInfo(info, 'emoji_value')).toBe('🚀✨🎉');
        expect(RedisUtils.extractValueFromInfo(info, 'special_chars')).toBe('áéíóú');
      });

      it('should handle values with newlines and escapes', () => {
        const info = 'normal_key:normal_value\ncomplex_key:value\\nwith\\tescapes';
        
        expect(RedisUtils.extractValueFromInfo(info, 'normal_key')).toBe('normal_value');
        expect(RedisUtils.extractValueFromInfo(info, 'complex_key')).toBe('value\\nwith\\tescapes');
      });
    });

    describe('performance and large inputs', () => {
      it('should handle large INFO strings efficiently', () => {
        // Create a large INFO string
        const largeInfo = Array.from({ length: 1000 }, (_, i) => `key${i}:value${i}`).join('\n');
        
        // Should find keys at different positions efficiently
        expect(RedisUtils.extractValueFromInfo(largeInfo, 'key0')).toBe('value0');
        expect(RedisUtils.extractValueFromInfo(largeInfo, 'key500')).toBe('value500');
        expect(RedisUtils.extractValueFromInfo(largeInfo, 'key999')).toBe('value999');
        expect(RedisUtils.extractValueFromInfo(largeInfo, 'key1000')).toBeNull();
      });

      it('should handle repeated key searches without performance degradation', () => {
        const info = 'target_key:target_value\nother:data';
        
        // Multiple searches should be fast
        for (let i = 0; i < 100; i++) {
          expect(RedisUtils.extractValueFromInfo(info, 'target_key')).toBe('target_value');
        }
      });
    });

    describe('real Redis INFO format examples', () => {
      it('should handle actual Redis INFO memory section', () => {
        const memoryInfo = `# Memory
used_memory:1048576
used_memory_human:1.00M
used_memory_rss:2097152
used_memory_rss_human:2.00M
used_memory_peak:1073741824
used_memory_peak_human:1.00G
mem_fragmentation_ratio:2.00
mem_fragmentation_bytes:1048576`;

        expect(RedisUtils.extractValueFromInfo(memoryInfo, 'used_memory')).toBe('1048576');
        expect(RedisUtils.extractValueFromInfo(memoryInfo, 'used_memory_human')).toBe('1.00M');
        expect(RedisUtils.extractValueFromInfo(memoryInfo, 'mem_fragmentation_ratio')).toBe('2.00');
      });

      it('should handle actual Redis INFO stats section', () => {
        const statsInfo = `# Stats
total_connections_received:1000
total_commands_processed:5000
instantaneous_ops_per_sec:100
total_net_input_bytes:2048000  
total_net_output_bytes:1024000
rejected_connections:0
sync_full:0
sync_partial_ok:0
sync_partial_err:0
expired_keys:0
evicted_keys:0
keyspace_hits:500
keyspace_misses:100
pubsub_channels:0
pubsub_patterns:0`;

        expect(RedisUtils.extractValueFromInfo(statsInfo, 'total_connections_received')).toBe('1000');
        expect(RedisUtils.extractValueFromInfo(statsInfo, 'keyspace_hits')).toBe('500');
        expect(RedisUtils.extractValueFromInfo(statsInfo, 'expired_keys')).toBe('0');
      });

      it('should handle keyspace section with database info', () => {
        const keyspaceInfo = `# Keyspace
db0:keys=100,expires=50,avg_ttl=3600000
db1:keys=200,expires=100,avg_ttl=7200000`;

        expect(RedisUtils.extractValueFromInfo(keyspaceInfo, 'db0')).toBe('keys=100,expires=50,avg_ttl=3600000');
        expect(RedisUtils.extractValueFromInfo(keyspaceInfo, 'db1')).toBe('keys=200,expires=100,avg_ttl=7200000');
        expect(RedisUtils.extractValueFromInfo(keyspaceInfo, 'db2')).toBeNull();
      });
    });
  });
});