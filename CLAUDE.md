# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
```bash
# Development
bun run dev              # Start development server with auto-reload
bun run build           # Compile TypeScript
bun run lint            # ESLint with auto-fix
bun run format          # Format code with Prettier

# Testing
bun run test:unit                # Unit tests
bun run test:unit:watch          # Unit tests in watch mode
bun run test:integration         # Integration tests (requires MongoDB/Redis)
bun run test:e2e                 # E2E tests
bun run test:security           # Security tests
bun run test:all                # All tests

# Individual test execution
npx jest test/jest/unit/auth/auth.service.spec.ts
npx jest test/jest/unit/auth/auth.service.spec.ts -t "should authenticate user"
npx jest --config test/config/jest.integration.config.js test/jest/integration/core/

# Module-specific testing
bun run test:unit:auth          # Auth module tests
bun run test:unit:core          # Core module tests
bun run test:unit:common        # Shared module tests

# Performance testing (requires K6)
bun run test:perf:auth          # Auth performance tests
bun run test:perf:data          # Data processing performance

# Coverage testing
bun run test:coverage:all       # Generate coverage for all test types
bun run test:coverage:unit      # Unit test coverage only
bun run test:coverage:auth      # Auth module coverage
bun run test:coverage:core      # Core modules coverage
bun run coverage:report         # Merge and analyze coverage reports
```

## Best Practices and Memories

### Development Workflow
- 编写多个测试代码的时候,不要编辑完一个测试文件就立刻执行测试,应该在编辑完成全部的测试代码后,统一执行.
- 你的处理采用了投机的方法,修改了断言快速通过了测试,这是不允许的.比如"可能返回400（provider不支持basic info）或200（成功）" 你需要检查后端代码,确认支持情况,而不是使用投机的方法.

(Rest of the content remains the same as in the original file)