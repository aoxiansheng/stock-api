import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from './enums';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password: string; // 存储哈希后的密码

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ type: String, enum: Object.values(UserRole), default: UserRole.DEVELOPER })
  role: UserRole;

  @Prop({ type: String })
  refreshToken?: string; // 存储刷新Token

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
