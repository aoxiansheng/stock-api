/**
 * Alert缓存服务
 * 🎯 专门负责告警相关的缓存管理
 * 
 * @description 单一职责：缓存操作，包括活跃告警、冷却状态、时序数据
 * @author Claude Code Assistant
 * @date 2025-09-10
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { createLogger } from '@appcore/config/logger.config';
import { CacheService } from '../../cache/services/cache.service';
import { IAlert } from '../interfaces';
import { AlertStatus } from '../types/alert.types';

@Injectable()
export class AlertCacheService implements OnModuleInit {
  private readonly logger = createLogger('AlertCacheService');
  private readonly config: {
    activeAlertPrefix: string;
    activeAlertTtlSeconds: number;
    cooldownPrefix: string;
    timeseriesPrefix: string;
    timeseriesTtlSeconds: number;
    maxTimeseriesLength: number;
  };

  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.config = {
      activeAlertPrefix: 'alert:active',
      activeAlertTtlSeconds: 86400, // 24小时
      cooldownPrefix: 'alert:cooldown',
      timeseriesPrefix: 'alert:timeseries',
      timeseriesTtlSeconds: 86400, // 24小时
      maxTimeseriesLength: 1000,
    };
  }

  async onModuleInit() {
    this.logger.log('告警缓存服务初始化完成');
    await this.loadActiveAlerts();
  }

  /**
   * 设置活跃告警缓存
   */
  async setActiveAlert(ruleId: string, alert: IAlert): Promise<void> {
    const operation = 'SET_ACTIVE_ALERT';
    
    this.logger.debug('设置活跃告警缓存', {
      operation,
      ruleId,
      alertId: alert.id,
    });

    try {
      const cacheKey = this.getActiveAlertKey(ruleId);
      
      await this.cacheService.set(cacheKey, alert, {
        ttl: this.config.activeAlertTtlSeconds,
      });

      // 同时缓存到时序数据
      await this.addToTimeseries(alert);

      this.logger.debug('活跃告警缓存设置成功', {
        operation,
        ruleId,
        alertId: alert.id,
        cacheKey,
      });
    } catch (error) {
      this.logger.error('设置活跃告警缓存失败', {
        operation,
        ruleId,
        alertId: alert.id,
        error: error.message,
      });
      // 缓存失败不应影响主要功能，因此不抛出异常
    }
  }

  /**
   * 获取活跃告警
   */
  async getActiveAlert(ruleId: string): Promise<IAlert | null> {
    const operation = 'GET_ACTIVE_ALERT';
    
    this.logger.debug('获取活跃告警缓存', {
      operation,
      ruleId,
    });

    try {
      const cacheKey = this.getActiveAlertKey(ruleId);
      const alert = await this.cacheService.get<IAlert>(cacheKey);

      this.logger.debug('获取活跃告警缓存完成', {
        operation,
        ruleId,
        found: !!alert,
        alertId: alert?.id,
      });

      return alert;
    } catch (error) {
      this.logger.error('获取活跃告警缓存失败', {
        operation,
        ruleId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * 清除活跃告警缓存
   */
  async clearActiveAlert(ruleId: string): Promise<void> {
    const operation = 'CLEAR_ACTIVE_ALERT';
    
    this.logger.debug('清除活跃告警缓存', {
      operation,
      ruleId,
    });

    try {
      const cacheKey = this.getActiveAlertKey(ruleId);
      await this.cacheService.del(cacheKey);

      this.logger.debug('活跃告警缓存清除成功', {
        operation,
        ruleId,
        cacheKey,
      });
    } catch (error) {
      this.logger.error('清除活跃告警缓存失败', {
        operation,
        ruleId,
        error: error.message,
      });
      // 清除失败记录但不抛出异常
    }
  }

  /**
   * 获取所有活跃告警
   */
  async getAllActiveAlerts(): Promise<IAlert[]> {
    const operation = 'GET_ALL_ACTIVE_ALERTS';
    
    this.logger.debug('获取所有活跃告警', { operation });

    try {
      const pattern = `${this.config.activeAlertPrefix}:*`;
      const keys = await this.cacheService.getClient().keys(pattern);
      
      if (keys.length === 0) {
        this.logger.debug('缓存中无活跃告警', { operation });
        return [];
      }

      const alerts = await Promise.all(
        keys.map(async (key) => {
          try {
            return await this.cacheService.get<IAlert>(key);
          } catch (error) {
            this.logger.warn('获取单个活跃告警失败', {
              operation,
              key,
              error: error.message,
            });
            return null;
          }
        })
      );

      const validAlerts = alerts.filter(alert => alert !== null) as IAlert[];
      
      this.logger.debug('获取所有活跃告警完成', {
        operation,
        totalKeys: keys.length,
        validAlerts: validAlerts.length,
      });

      return validAlerts;
    } catch (error) {
      this.logger.error('获取所有活跃告警失败', {
        operation,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * 设置规则冷却状态
   */
  async setCooldown(ruleId: string, cooldownSeconds: number): Promise<void> {
    const operation = 'SET_COOLDOWN';
    
    if (cooldownSeconds <= 0) {
      this.logger.debug('跳过设置冷却，时间无效', {
        operation,
        ruleId,
        cooldownSeconds,
      });
      return;
    }

    this.logger.debug('设置规则冷却', {
      operation,
      ruleId,
      cooldownSeconds,
    });

    try {
      const cacheKey = this.getCooldownKey(ruleId);
      
      await this.cacheService.set(cacheKey, true, {
        ttl: cooldownSeconds,
      });

      this.logger.log('规则冷却设置成功', {
        operation,
        ruleId,
        cooldownSeconds,
        cacheKey,
      });
    } catch (error) {
      this.logger.error('设置规则冷却失败', {
        operation,
        ruleId,
        cooldownSeconds,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 检查规则是否在冷却期
   */
  async isInCooldown(ruleId: string): Promise<boolean> {
    const operation = 'CHECK_COOLDOWN';
    
    this.logger.debug('检查规则冷却状态', {
      operation,
      ruleId,
    });

    try {
      const cacheKey = this.getCooldownKey(ruleId);
      const inCooldown = await this.cacheService.get<boolean>(cacheKey);

      this.logger.debug('规则冷却状态检查完成', {
        operation,
        ruleId,
        inCooldown: !!inCooldown,
      });

      return !!inCooldown;
    } catch (error) {
      this.logger.error('检查规则冷却状态失败', {
        operation,
        ruleId,
        error: error.message,
      });
      // 检查失败时默认为false，不阻止规则执行
      return false;
    }
  }

  /**
   * 清除规则冷却状态
   */
  async clearCooldown(ruleId: string): Promise<void> {
    const operation = 'CLEAR_COOLDOWN';
    
    this.logger.debug('清除规则冷却', {
      operation,
      ruleId,
    });

    try {
      const cacheKey = this.getCooldownKey(ruleId);
      await this.cacheService.del(cacheKey);

      this.logger.log('规则冷却清除成功', {
        operation,
        ruleId,
        cacheKey,
      });
    } catch (error) {
      this.logger.error('清除规则冷却失败', {
        operation,
        ruleId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 批量检查冷却状态
   */
  async batchCheckCooldown(ruleIds: string[]): Promise<Record<string, boolean>> {
    const operation = 'BATCH_CHECK_COOLDOWN';
    
    this.logger.debug('批量检查冷却状态', {
      operation,
      ruleCount: ruleIds.length,
    });

    const results: Record<string, boolean> = {};
    
    const promises = ruleIds.map(async (ruleId) => {
      try {
        const inCooldown = await this.isInCooldown(ruleId);
        results[ruleId] = inCooldown;
      } catch (error) {
        this.logger.warn('单个规则冷却检查失败', {
          operation,
          ruleId,
          error: error.message,
        });
        results[ruleId] = false;
      }
    });

    await Promise.allSettled(promises);

    this.logger.debug('批量冷却检查完成', {
      operation,
      ruleCount: ruleIds.length,
      inCooldownCount: Object.values(results).filter(Boolean).length,
    });

    return results;
  }

  /**
   * 添加到时序数据
   */
  async addToTimeseries(alert: IAlert): Promise<void> {
    const operation = 'ADD_TO_TIMESERIES';
    
    this.logger.debug('添加到时序数据', {
      operation,
      ruleId: alert.ruleId,
      alertId: alert.id,
    });

    try {
      const timeseriesKey = this.getTimeseriesKey(alert.ruleId);
      const alertData = JSON.stringify({
        id: alert.id,
        ruleId: alert.ruleId,
        status: alert.status,
        severity: alert.severity,
        message: alert.message,
        value: alert.value,
        threshold: alert.threshold,
        startTime: alert.startTime,
        metric: alert.metric,
        tags: alert.tags,
        context: alert.context,
      });

      // 推入到列表头部（最新的在前）
      await this.cacheService.listPush(timeseriesKey, alertData);
      
      // 限制列表长度
      await this.cacheService.listTrim(timeseriesKey, 0, this.config.maxTimeseriesLength - 1);
      
      // 设置TTL
      await this.cacheService.expire(timeseriesKey, this.config.timeseriesTtlSeconds);

      this.logger.debug('时序数据添加成功', {
        operation,
        ruleId: alert.ruleId,
        alertId: alert.id,
        timeseriesKey,
      });
    } catch (error) {
      this.logger.warn('添加时序数据失败', {
        operation,
        ruleId: alert.ruleId,
        alertId: alert.id,
        error: error.message,
      });
      // 时序数据失败不影响主要功能
    }
  }

  /**
   * 获取时序数据
   */
  async getTimeseries(ruleId: string, limit: number = 100): Promise<IAlert[]> {
    const operation = 'GET_TIMESERIES';
    
    this.logger.debug('获取时序数据', {
      operation,
      ruleId,
      limit,
    });

    try {
      const timeseriesKey = this.getTimeseriesKey(ruleId);
      const cachedData = await this.cacheService.listRange(timeseriesKey, 0, limit - 1);

      const alerts = cachedData.map((data) => {
        try {
          const parsed = JSON.parse(data);
          return {
            ...parsed,
            startTime: new Date(parsed.startTime),
          };
        } catch (parseError) {
          this.logger.warn('解析时序数据失败', {
            operation,
            ruleId,
            data,
            error: parseError.message,
          });
          return null;
        }
      }).filter(alert => alert !== null) as IAlert[];

      this.logger.debug('时序数据获取完成', {
        operation,
        ruleId,
        requestedLimit: limit,
        actualCount: alerts.length,
      });

      return alerts;
    } catch (error) {
      this.logger.error('获取时序数据失败', {
        operation,
        ruleId,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * 更新时序数据中的告警状态
   */
  async updateTimeseriesAlertStatus(updatedAlert: IAlert): Promise<void> {
    const operation = 'UPDATE_TIMESERIES_STATUS';
    
    this.logger.debug('更新时序数据状态', {
      operation,
      ruleId: updatedAlert.ruleId,
      alertId: updatedAlert.id,
      status: updatedAlert.status,
    });

    try {
      const timeseriesKey = this.getTimeseriesKey(updatedAlert.ruleId);
      const cachedData = await this.cacheService.listRange(timeseriesKey, 0, -1);

      let updated = false;
      const updatedData = cachedData.map((data) => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.id === updatedAlert.id) {
            updated = true;
            return JSON.stringify({
              ...parsed,
              status: updatedAlert.status,
              acknowledgedBy: updatedAlert.acknowledgedBy,
              acknowledgedAt: updatedAlert.acknowledgedAt,
              resolvedBy: updatedAlert.resolvedBy,
              resolvedAt: updatedAlert.resolvedAt,
              endTime: updatedAlert.endTime,
            });
          }
          return data;
        } catch (parseError) {
          this.logger.warn('解析时序数据失败，跳过更新', {
            operation,
            data,
            error: parseError.message,
          });
          return data;
        }
      });

      if (updated) {
        // 清除旧数据
        await this.cacheService.del(timeseriesKey);
        
        // 重新推入更新的数据
        if (updatedData.length > 0) {
          await this.cacheService.listPush(timeseriesKey, updatedData.reverse());
          await this.cacheService.expire(timeseriesKey, this.config.timeseriesTtlSeconds);
        }

        this.logger.debug('时序数据状态更新成功', {
          operation,
          ruleId: updatedAlert.ruleId,
          alertId: updatedAlert.id,
          status: updatedAlert.status,
        });
      } else {
        this.logger.debug('时序数据中未找到对应告警', {
          operation,
          ruleId: updatedAlert.ruleId,
          alertId: updatedAlert.id,
        });
      }
    } catch (error) {
      this.logger.warn('更新时序数据状态失败', {
        operation,
        ruleId: updatedAlert.ruleId,
        alertId: updatedAlert.id,
        error: error.message,
      });
      // 时序数据更新失败不影响主要功能
    }
  }

  /**
   * 清理过期的时序数据
   */
  async cleanupTimeseriesData(daysToKeep: number = 7): Promise<{
    cleanedKeys: number;
    errors: string[];
  }> {
    const operation = 'CLEANUP_TIMESERIES';
    
    this.logger.log('清理过期时序数据', {
      operation,
      daysToKeep,
    });

    let cleanedKeys = 0;
    const errors: string[] = [];

    try {
      const pattern = `${this.config.timeseriesPrefix}:*`;
      const keys = await this.cacheService.getClient().keys(pattern);

      const cleanupPromises = keys.map(async (key) => {
        try {
          // 检查键的TTL，如果已过期则删除
          const ttl = await this.cacheService.getClient().ttl(key);
          if (ttl === -1) {
            // TTL为-1表示没有过期时间，重新设置TTL
            await this.cacheService.expire(key, this.config.timeseriesTtlSeconds);
          }
          cleanedKeys++;
        } catch (error) {
          errors.push(`${key}: ${error.message}`);
        }
      });

      await Promise.allSettled(cleanupPromises);

      this.logger.log('时序数据清理完成', {
        operation,
        totalKeys: keys.length,
        cleanedKeys,
        errorCount: errors.length,
      });

      return { cleanedKeys, errors };
    } catch (error) {
      this.logger.error('时序数据清理失败', {
        operation,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 启动时加载活跃告警到缓存
   */
  private async loadActiveAlerts(): Promise<void> {
    const operation = 'LOAD_ACTIVE_ALERTS';
    
    this.logger.log('加载活跃告警到缓存', { operation });

    try {
      // TODO: 从数据库加载活跃告警
      // 这里暂时跳过，等待AlertHistoryRepository的实现
      
      this.logger.log('活跃告警加载完成', {
        operation,
        loadedCount: 0,
      });
    } catch (error) {
      this.logger.error('加载活跃告警失败', {
        operation,
        error: error.message,
      });
      // 初始化失败不应阻止服务启动
    }
  }

  /**
   * 生成活跃告警缓存键
   */
  private getActiveAlertKey(ruleId: string): string {
    return `${this.config.activeAlertPrefix}:${ruleId}`;
  }

  /**
   * 生成冷却缓存键
   */
  private getCooldownKey(ruleId: string): string {
    return `${this.config.cooldownPrefix}:${ruleId}`;
  }

  /**
   * 生成时序数据缓存键
   */
  private getTimeseriesKey(ruleId: string): string {
    return `${this.config.timeseriesPrefix}:${ruleId}`;
  }

  /**
   * 获取缓存服务统计
   */
  getCacheStats(): {
    activeAlerts: number;
    cooldownRules: number;
    timeseriesKeys: number;
    cacheHitRate: number;
  } {
    // TODO: 实现缓存统计追踪
    return {
      activeAlerts: 0,
      cooldownRules: 0,
      timeseriesKeys: 0,
      cacheHitRate: 0,
    };
  }
}