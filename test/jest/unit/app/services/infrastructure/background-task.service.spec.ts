import { Test, TestingModule } from "@nestjs/testing";

import { BackgroundTaskService } from "../../../../../../src/app/services/infrastructure/background-task.service";
import { CollectorService } from "../../../../../../src/monitoring/collector/collector.service";

describe("BackgroundTaskService", () => {
  let service: BackgroundTaskService;
  let mockCollectorService: jest.Mocked<CollectorService>;

  beforeEach(async () => {
    mockCollectorService = {
      recordRequest: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackgroundTaskService,
        {
          provide: CollectorService,
          useValue: mockCollectorService,
        },
      ],
    }).compile();

    service = module.get<BackgroundTaskService>(BackgroundTaskService);
    mockCollectorService = module.get(CollectorService);

    // Mock logger to avoid console output during tests
    jest.spyOn(service["logger"], "debug").mockImplementation();
    jest.spyOn(service["logger"], "error").mockImplementation();
    jest.spyOn(service["logger"], "warn").mockImplementation();

    jest.clearAllMocks();
  });

  describe("run", () => {
    it("should execute a successful background task", (done) => {
      const mockTask = jest.fn().mockResolvedValue("task result");
      const taskDescription = "test-task";

      service.run(mockTask, taskDescription);

      // 验证任务计数增加
      const stats = service.getTaskStatistics();
      expect(stats[taskDescription]).toBe(1);

      // 等待 setImmediate 和 task 完成
      setImmediate(() => {
        setTimeout(() => {
          expect(mockTask).toHaveBeenCalledTimes(1);

          // 等待第二次 setImmediate (监控记录)
          setImmediate(() => {
            expect(mockCollectorService.recordRequest).toHaveBeenCalledWith(
              "/internal/background-task/test-task",
              "POST",
              200,
              expect.any(Number),
              expect.objectContaining({
                operation: "background_task_execution",
                task_type: "test-task",
                task_id: expect.stringMatching(/^test-task_\d+_[a-z0-9]+$/),
                status: "success",
              }),
            );

            // 验证任务计数减少
            const finalStats = service.getTaskStatistics();
            expect(finalStats[taskDescription]).toBeUndefined();

            done();
          });
        }, 10);
      });
    });

    it("should handle task failure gracefully", (done) => {
      const taskError = new Error("Task execution failed");
      const mockTask = jest.fn().mockRejectedValue(taskError);
      const taskDescription = "failing-task";

      service.run(mockTask, taskDescription);

      // 等待 setImmediate 和 task 完成
      setImmediate(() => {
        setTimeout(() => {
          expect(mockTask).toHaveBeenCalledTimes(1);
          expect(service["logger"].error).toHaveBeenCalledWith(
            'Background task "failing-task" failed.',
            expect.objectContaining({
              error: "Task execution failed",
              stack: expect.any(String),
            }),
          );

          // 等待监控记录
          setImmediate(() => {
            expect(mockCollectorService.recordRequest).toHaveBeenCalledWith(
              "/internal/background-task/failing-task",
              "POST",
              500,
              expect.any(Number),
              expect.objectContaining({
                operation: "background_task_execution",
                task_type: "failing-task",
                task_id: expect.stringMatching(/^failing-task_\d+_[a-z0-9]+$/),
                status: "error",
                error: "Task execution failed",
              }),
            );

            done();
          });
        }, 10);
      });
    });

    it("should handle multiple concurrent tasks", (done) => {
      const mockTask1 = jest.fn().mockResolvedValue("result1");
      const mockTask2 = jest.fn().mockResolvedValue("result2");
      const taskDescription1 = "concurrent-task-1";
      const taskDescription2 = "concurrent-task-2";

      service.run(mockTask1, taskDescription1);
      service.run(mockTask2, taskDescription2);

      // 验证并发任务计数
      const stats = service.getTaskStatistics();
      expect(stats[taskDescription1]).toBe(1);
      expect(stats[taskDescription2]).toBe(1);

      // 等待任务完成
      setImmediate(() => {
        setTimeout(() => {
          expect(mockTask1).toHaveBeenCalledTimes(1);
          expect(mockTask2).toHaveBeenCalledTimes(1);

          // 等待监控记录
          setImmediate(() => {
            setTimeout(() => {
              expect(mockCollectorService.recordRequest).toHaveBeenCalledTimes(
                2,
              );
              done();
            }, 20);
          });
        }, 10);
      });
    });

    it("should log debug message when starting task", () => {
      const mockTask = jest.fn().mockResolvedValue("result");
      const taskDescription = "debug-test-task";

      service.run(mockTask, taskDescription);

      expect(service["logger"].debug).toHaveBeenCalledWith(
        "Executing background task: debug-test-task",
      );
    });
  });

  describe("getTaskStatistics", () => {
    it("should return empty statistics when no tasks are running", () => {
      const stats = service.getTaskStatistics();
      expect(stats).toEqual({});
    });

    it("should track task statistics correctly", () => {
      const mockTask = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            // 任务不会立即完成，让我们可以检查统计
            setTimeout(resolve, 100);
          }),
      );

      service.run(mockTask, "task-1");
      service.run(mockTask, "task-1");
      service.run(mockTask, "task-2");

      const stats = service.getTaskStatistics();
      expect(stats).toEqual({
        "task-1": 2,
        "task-2": 1,
      });
    });
  });

  describe("Error handling", () => {
    it("should handle collector service errors gracefully", (done) => {
      mockCollectorService.recordRequest.mockImplementation(() => {
        throw new Error("Collector service unavailable");
      });

      const mockTask = jest.fn().mockResolvedValue("result");
      service.run(mockTask, "error-test-task");

      setImmediate(() => {
        setTimeout(() => {
          // 等待监控记录尝试
          setImmediate(() => {
            expect(service["logger"].warn).toHaveBeenCalledWith(
              "后台任务监控记录失败",
              expect.objectContaining({
                error: "Collector service unavailable",
                endpoint: "/internal/background-task/error-test-task",
                method: "POST",
              }),
            );
            done();
          });
        }, 10);
      });
    });

    it("should not throw unhandled promise rejections", (done) => {
      const originalListeners = process.listeners("unhandledRejection");
      let unhandledRejectionCaught = false;

      const unhandledRejectionHandler = () => {
        unhandledRejectionCaught = true;
      };

      process.on("unhandledRejection", unhandledRejectionHandler);

      const mockTask = jest.fn().mockRejectedValue(new Error("Async error"));
      service.run(mockTask, "rejection-test");

      setTimeout(() => {
        // 清理事件监听器
        process.removeListener("unhandledRejection", unhandledRejectionHandler);

        expect(unhandledRejectionCaught).toBe(false);
        expect(service["logger"].error).toHaveBeenCalled();
        done();
      }, 50);
    });
  });
});
