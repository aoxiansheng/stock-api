# SmartCache K6 Performance Tests

This directory contains K6 performance tests specifically designed to validate the SmartCache optimization features.

## Prerequisites

1. Install K6: https://k6.io/docs/getting-started/installation/
2. Ensure the backend application is running on localhost:3000
3. Create test API credentials (or use default test values)

## Test Scripts

### 1. smart-cache-basic.js
**Purpose**: Basic SmartCache functionality validation
- Tests both Receiver (strong timeliness) and Query (weak timeliness) caches
- Moderate load to verify cache hit rates and response times
- **Duration**: ~4 minutes
- **Max concurrent users**: 50

**Run with**:
```bash
k6 run test/k6/smart-cache-basic.js
```

### 2. smart-cache-performance-stress.js
**Purpose**: Comprehensive stress testing
- Multiple scenarios including baseline, ramp-up, spike, and endurance tests
- Tests dynamic concurrency adjustment and memory pressure handling
- **Duration**: ~25 minutes total
- **Max concurrent users**: 500

**Run with**:
```bash
k6 run test/k6/smart-cache-performance-stress.js
```

## Environment Variables

- `BASE_URL`: API base URL (default: http://localhost:3000)
- `API_KEY`: Test API key (default: test-app-key)
- `ACCESS_TOKEN`: Test access token (default: test-access-token)

**Example**:
```bash
BASE_URL=http://localhost:3000 API_KEY=your-key ACCESS_TOKEN=your-token k6 run test/k6/smart-cache-basic.js
```

## Expected Performance Targets

### Basic Test Targets
- P95 Response Time: <1000ms
- Failure Rate: <2%
- Cache Hit Rate: >50%

### Stress Test Targets
- P95 Response Time: <500ms (SmartCache specific)
- P99 Response Time: <1000ms (SmartCache specific)
- Failure Rate: <1%
- Concurrency adjustments should occur during load spikes
- Memory pressure events should be controlled (<100 events)

## Test Scenarios

### Basic Test
1. **Ramp Up** (30s): 5 → 20 users
2. **Steady Load** (1m): 20 users
3. **Peak Load** (30s): 20 → 50 users  
4. **High Load** (1m): 50 users
5. **Ramp Down** (30s): 50 → 0 users

### Stress Test
1. **Baseline** (2m): 50 concurrent users
2. **Ramp Up** (9m): 10 → 300 users with stages
3. **Spike Test** (3m): 500 concurrent users
4. **Endurance** (10m): 30 concurrent users

## Interpreting Results

### Cache Performance
- **Cache Hit Rate**: Percentage of requests served from cache
- **Response Time**: Lower is better, cache hits should be <100ms
- **Failure Rate**: Should remain low even under high load

### Dynamic Optimization
- **Concurrency Adjustments**: Should increase during high load
- **Memory Pressure Events**: Should trigger during spike tests
- **Response Degradation**: Should be graceful during overload

### Monitoring
- Watch for log output from SmartCachePerformanceOptimizer
- Monitor system resources during tests
- Check for memory leaks in extended runs

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Ensure backend is running
   - Check API_KEY and ACCESS_TOKEN are valid
   - Verify endpoints exist and accept POST requests

2. **High Failure Rates**
   - Check server logs for errors
   - Monitor system resources (CPU, memory)
   - Reduce concurrent users if system overloaded

3. **Low Cache Hit Rates**
   - Verify SmartCache is enabled
   - Check cache TTL settings
   - Monitor cache invalidation patterns

### Performance Issues
- **High Response Times**: Check database connections, provider API limits
- **Memory Leaks**: Run extended tests with memory monitoring
- **CPU Bottlenecks**: Monitor system load during tests

## Integration with CI/CD

Add to your pipeline to validate SmartCache performance:

```bash
# Quick validation
k6 run --duration 30s --vus 10 test/k6/smart-cache-basic.js

# Full validation
k6 run test/k6/smart-cache-basic.js
```