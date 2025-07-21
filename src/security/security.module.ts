import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../cache/cache.module';

import { SecurityAuditLogRepository } from './repositories/security-audit-log.repository';
import { SecurityScanResultRepository } from './repositories/security-scan-result.repository';
import {
  SecurityAuditLog,
  SecurityAuditLogSchema,
} from './schemas/security-audit-log.schema';
import {
  SecurityScanResult,
  SecurityScanResultSchema,
} from './schemas/security-scan-result.schema';
import { SecurityAuditService } from './security-audit.service';
import { SecurityScannerService } from './security-scanner.service';
import { SecurityController } from './security.controller';

@Module({
  imports: [
    CacheModule,
    AuthModule,
    ConfigModule,
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: SecurityAuditLog.name, schema: SecurityAuditLogSchema },
      { name: SecurityScanResult.name, schema: SecurityScanResultSchema },
    ]),
  ],
  providers: [
    SecurityAuditService,
    SecurityScannerService,
    SecurityAuditLogRepository,
    SecurityScanResultRepository,
  ],
  controllers: [SecurityController],
  exports: [
    SecurityAuditService,
    SecurityScannerService,
    SecurityAuditLogRepository,
    SecurityScanResultRepository,
  ],
})
export class SecurityModule {}
