import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { PaginationService } from "@common/modules/pagination/services/pagination.service";

import { User, UserDocument } from "../schemas/user.schema";
@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly paginationService: PaginationService,
  ) {}

  async create(
    userDto: Pick<
      User,
      "username" | "email" | "passwordHash" | "role" | "isActive"
    >,
  ): Promise<UserDocument> {
    const user = new this.userModel(userDto);
    return user.save();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async findByUsernameOrEmail(
    username: string,
    email: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        $or: [{ username }, { email }],
      })
      .exec();
  }

  /**
   * 根据用户名列表查找用户
   * @param usernames - 用户名数组
   */
  async findByUsernames(usernames: string[]): Promise<UserDocument[]> {
    return this.userModel.find({ username: { $in: usernames } }).exec();
  }

  /**
   * 分页查询所有用户
   * @param page - 页码（从1开始）
   * @param limit - 每页数量
   * @param includeInactive - 是否包含非活跃用户
   * @returns 分页结果
   */
  async findAllPaginated(
    page: number = 1,
    limit: number = 10,
    includeInactive: boolean = false,
  ) {
    // 使用通用分页服务标准化参数
    const { page: normalizedPage, limit: normalizedLimit } =
      this.paginationService.normalizePaginationQuery({
        page,
        limit,
      });

    const skip = this.paginationService.calculateSkip(
      normalizedPage,
      normalizedLimit,
    );
    const filter = includeInactive ? {} : { isActive: true };

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select("-passwordHash") // 排除密码哈希
        .sort({ createdAt: -1 }) // 按创建时间倒序
        .skip(skip)
        .limit(normalizedLimit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    // 使用通用分页服务创建分页信息
    const pagination = this.paginationService.createPagination(
      normalizedPage,
      normalizedLimit,
      total,
    );

    return {
      users,
      ...pagination,
    };
  }

  /**
   * 获取用户统计信息
   * @returns 用户统计数据
   */
  async getUserStats() {
    const [totalUsers, activeUsers, usersByRole] = await Promise.all([
      this.userModel.countDocuments().exec(),
      this.userModel.countDocuments({ isActive: true }).exec(),
      this.userModel
        .aggregate([
          {
            $group: {
              _id: "$role",
              count: { $sum: 1 },
            },
          },
        ])
        .exec(),
    ]);

    const roleStats = usersByRole.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      roleDistribution: roleStats,
    };
  }
}
