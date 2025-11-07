import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { ApiKey, ApiKeySchema } from "./schema";
import { JwtStrategy, ApiKeyStrategy } from "./strategies";
import { AuthService } from "./service";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "changeme",
      // 类型兼容处理：expiresIn 接受 ms.StringValue 或 number
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN as any) || "24h" },
    }),
    MongooseModule.forFeature([{ name: "ApiKey", schema: ApiKeySchema }]),
  ],
  providers: [JwtStrategy, ApiKeyStrategy, AuthService],
  exports: [AuthService, PassportModule, JwtModule, MongooseModule],
})
export class AuthModule {}
