import {
  CommonStatus,
  StatusTransitionRules,
  StatusUtils,
  StatusGroups,
} from "../../../../../src/auth/enums/common-status.enum";

describe("CommonStatus Enum", () => {
  describe("StatusTransitionRules", () => {
    describe("fromPending", () => {
      it("should allow transition from PENDING to ACTIVE", () => {
        expect(StatusTransitionRules.fromPending(CommonStatus.ACTIVE)).toBe(
          true,
        );
      });

      it("should allow transition from PENDING to INACTIVE", () => {
        expect(StatusTransitionRules.fromPending(CommonStatus.INACTIVE)).toBe(
          true,
        );
      });

      it("should allow transition from PENDING to DELETED", () => {
        expect(StatusTransitionRules.fromPending(CommonStatus.DELETED)).toBe(
          true,
        );
      });

      it("should allow transition from PENDING to EXPIRED", () => {
        expect(StatusTransitionRules.fromPending(CommonStatus.EXPIRED)).toBe(
          true,
        );
      });

      it("should not allow transition from PENDING to SUSPENDED", () => {
        expect(StatusTransitionRules.fromPending(CommonStatus.SUSPENDED)).toBe(
          false,
        );
      });

      it("should not allow transition from PENDING to REVOKED", () => {
        expect(StatusTransitionRules.fromPending(CommonStatus.REVOKED)).toBe(
          false,
        );
      });

      it("should not allow transition from PENDING to LOCKED", () => {
        expect(StatusTransitionRules.fromPending(CommonStatus.LOCKED)).toBe(
          false,
        );
      });

      it("should not allow transition from PENDING to PENDING_VERIFICATION", () => {
        expect(
          StatusTransitionRules.fromPending(CommonStatus.PENDING_VERIFICATION),
        ).toBe(false);
      });
    });

    describe("fromPendingVerification", () => {
      it("should allow transition from PENDING_VERIFICATION to ACTIVE", () => {
        expect(
          StatusTransitionRules.fromPendingVerification(CommonStatus.ACTIVE),
        ).toBe(true);
      });

      it("should allow transition from PENDING_VERIFICATION to REVOKED", () => {
        expect(
          StatusTransitionRules.fromPendingVerification(CommonStatus.REVOKED),
        ).toBe(true);
      });

      it("should allow transition from PENDING_VERIFICATION to DELETED", () => {
        expect(
          StatusTransitionRules.fromPendingVerification(CommonStatus.DELETED),
        ).toBe(true);
      });

      it("should allow transition from PENDING_VERIFICATION to EXPIRED", () => {
        expect(
          StatusTransitionRules.fromPendingVerification(CommonStatus.EXPIRED),
        ).toBe(true);
      });

      it("should not allow transition from PENDING_VERIFICATION to INACTIVE", () => {
        expect(
          StatusTransitionRules.fromPendingVerification(CommonStatus.INACTIVE),
        ).toBe(false);
      });

      it("should not allow transition from PENDING_VERIFICATION to SUSPENDED", () => {
        expect(
          StatusTransitionRules.fromPendingVerification(CommonStatus.SUSPENDED),
        ).toBe(false);
      });

      it("should not allow transition from PENDING_VERIFICATION to LOCKED", () => {
        expect(
          StatusTransitionRules.fromPendingVerification(CommonStatus.LOCKED),
        ).toBe(false);
      });

      it("should not allow transition from PENDING_VERIFICATION to PENDING", () => {
        expect(
          StatusTransitionRules.fromPendingVerification(CommonStatus.PENDING),
        ).toBe(false);
      });
    });

    describe("fromAvailable", () => {
      it("should allow any transition from AVAILABLE state", () => {
        expect(StatusTransitionRules.fromAvailable()).toBe(true);
      });
    });

    describe("fromUnavailable", () => {
      it("should allow transition from UNAVAILABLE to ACTIVE", () => {
        expect(StatusTransitionRules.fromUnavailable(CommonStatus.ACTIVE)).toBe(
          true,
        );
      });

      it("should allow transition from UNAVAILABLE to DELETED", () => {
        expect(
          StatusTransitionRules.fromUnavailable(CommonStatus.DELETED),
        ).toBe(true);
      });

      it("should not allow transition from UNAVAILABLE to PENDING", () => {
        expect(
          StatusTransitionRules.fromUnavailable(CommonStatus.PENDING),
        ).toBe(false);
      });

      it("should not allow transition from UNAVAILABLE to EXPIRED", () => {
        expect(
          StatusTransitionRules.fromUnavailable(CommonStatus.EXPIRED),
        ).toBe(false);
      });
    });

    describe("fromFinal", () => {
      it("should not allow any transition from FINAL state", () => {
        expect(StatusTransitionRules.fromFinal()).toBe(false);
      });
    });
  });

  describe("StatusUtils", () => {
    describe("canTransition", () => {
      it("should not allow transition to the same state", () => {
        expect(
          StatusUtils.canTransition(CommonStatus.ACTIVE, CommonStatus.ACTIVE),
        ).toBe(false);
        expect(
          StatusUtils.canTransition(CommonStatus.PENDING, CommonStatus.PENDING),
        ).toBe(false);
      });

      it("should use fromPending rules for PENDING state", () => {
        expect(
          StatusUtils.canTransition(CommonStatus.PENDING, CommonStatus.ACTIVE),
        ).toBe(true);
        expect(
          StatusUtils.canTransition(
            CommonStatus.PENDING,
            CommonStatus.INACTIVE,
          ),
        ).toBe(true);
        expect(
          StatusUtils.canTransition(CommonStatus.PENDING, CommonStatus.DELETED),
        ).toBe(true);
        expect(
          StatusUtils.canTransition(CommonStatus.PENDING, CommonStatus.EXPIRED),
        ).toBe(true);
        expect(
          StatusUtils.canTransition(
            CommonStatus.PENDING,
            CommonStatus.SUSPENDED,
          ),
        ).toBe(false);
        expect(
          StatusUtils.canTransition(CommonStatus.PENDING, CommonStatus.REVOKED),
        ).toBe(false);
      });

      it("should use fromPendingVerification rules for PENDING_VERIFICATION state", () => {
        expect(
          StatusUtils.canTransition(
            CommonStatus.PENDING_VERIFICATION,
            CommonStatus.ACTIVE,
          ),
        ).toBe(true);
        expect(
          StatusUtils.canTransition(
            CommonStatus.PENDING_VERIFICATION,
            CommonStatus.REVOKED,
          ),
        ).toBe(true);
        expect(
          StatusUtils.canTransition(
            CommonStatus.PENDING_VERIFICATION,
            CommonStatus.DELETED,
          ),
        ).toBe(true);
        expect(
          StatusUtils.canTransition(
            CommonStatus.PENDING_VERIFICATION,
            CommonStatus.EXPIRED,
          ),
        ).toBe(true);
        expect(
          StatusUtils.canTransition(
            CommonStatus.PENDING_VERIFICATION,
            CommonStatus.INACTIVE,
          ),
        ).toBe(false);
        expect(
          StatusUtils.canTransition(
            CommonStatus.PENDING_VERIFICATION,
            CommonStatus.SUSPENDED,
          ),
        ).toBe(false);
      });

      it("should allow any transition from ACTIVE state", () => {
        expect(
          StatusUtils.canTransition(CommonStatus.ACTIVE, CommonStatus.INACTIVE),
        ).toBe(true);
        expect(
          StatusUtils.canTransition(
            CommonStatus.ACTIVE,
            CommonStatus.SUSPENDED,
          ),
        ).toBe(true);
        expect(
          StatusUtils.canTransition(CommonStatus.ACTIVE, CommonStatus.DELETED),
        ).toBe(true);
        expect(
          StatusUtils.canTransition(CommonStatus.ACTIVE, CommonStatus.EXPIRED),
        ).toBe(true);
        expect(
          StatusUtils.canTransition(CommonStatus.ACTIVE, CommonStatus.REVOKED),
        ).toBe(true);
        expect(
          StatusUtils.canTransition(CommonStatus.ACTIVE, CommonStatus.LOCKED),
        ).toBe(true);
        expect(
          StatusUtils.canTransition(CommonStatus.ACTIVE, CommonStatus.PENDING),
        ).toBe(true);
        expect(
          StatusUtils.canTransition(
            CommonStatus.ACTIVE,
            CommonStatus.PENDING_VERIFICATION,
          ),
        ).toBe(true);
      });

      it("should restrict transitions from INACTIVE state", () => {
        expect(
          StatusUtils.canTransition(CommonStatus.INACTIVE, CommonStatus.ACTIVE),
        ).toBe(true);
        expect(
          StatusUtils.canTransition(
            CommonStatus.INACTIVE,
            CommonStatus.DELETED,
          ),
        ).toBe(true);
        expect(
          StatusUtils.canTransition(
            CommonStatus.INACTIVE,
            CommonStatus.PENDING,
          ),
        ).toBe(false);
        expect(
          StatusUtils.canTransition(
            CommonStatus.INACTIVE,
            CommonStatus.EXPIRED,
          ),
        ).toBe(false);
      });

      it("should not allow any transition from DELETED state (final)", () => {
        expect(
          StatusUtils.canTransition(CommonStatus.DELETED, CommonStatus.ACTIVE),
        ).toBe(false);
        expect(
          StatusUtils.canTransition(
            CommonStatus.DELETED,
            CommonStatus.INACTIVE,
          ),
        ).toBe(false);
        expect(
          StatusUtils.canTransition(CommonStatus.DELETED, CommonStatus.PENDING),
        ).toBe(false);
      });

      it("should not allow any transition from REVOKED state (final)", () => {
        expect(
          StatusUtils.canTransition(CommonStatus.REVOKED, CommonStatus.ACTIVE),
        ).toBe(false);
        expect(
          StatusUtils.canTransition(
            CommonStatus.REVOKED,
            CommonStatus.INACTIVE,
          ),
        ).toBe(false);
        expect(
          StatusUtils.canTransition(CommonStatus.REVOKED, CommonStatus.PENDING),
        ).toBe(false);
      });
    });

    describe("isAvailable", () => {
      it("should return true for ACTIVE status", () => {
        expect(StatusUtils.isAvailable(CommonStatus.ACTIVE)).toBe(true);
      });

      it("should return false for non-available statuses", () => {
        expect(StatusUtils.isAvailable(CommonStatus.INACTIVE)).toBe(false);
        expect(StatusUtils.isAvailable(CommonStatus.PENDING)).toBe(false);
        expect(StatusUtils.isAvailable(CommonStatus.SUSPENDED)).toBe(false);
      });
    });

    describe("isTemporary", () => {
      it("should return true for temporary statuses", () => {
        expect(StatusUtils.isTemporary(CommonStatus.PENDING)).toBe(true);
        expect(StatusUtils.isTemporary(CommonStatus.PENDING_VERIFICATION)).toBe(
          true,
        );
      });

      it("should return false for non-temporary statuses", () => {
        expect(StatusUtils.isTemporary(CommonStatus.ACTIVE)).toBe(false);
        expect(StatusUtils.isTemporary(CommonStatus.DELETED)).toBe(false);
        expect(StatusUtils.isTemporary(CommonStatus.REVOKED)).toBe(false);
      });
    });

    describe("isFinal", () => {
      it("should return true for final statuses", () => {
        expect(StatusUtils.isFinal(CommonStatus.DELETED)).toBe(true);
        expect(StatusUtils.isFinal(CommonStatus.REVOKED)).toBe(true);
      });

      it("should return false for non-final statuses", () => {
        expect(StatusUtils.isFinal(CommonStatus.ACTIVE)).toBe(false);
        expect(StatusUtils.isFinal(CommonStatus.PENDING)).toBe(false);
        expect(StatusUtils.isFinal(CommonStatus.EXPIRED)).toBe(false);
      });
    });

    describe("getDisplayName", () => {
      it("should return correct display names", () => {
        expect(StatusUtils.getDisplayName(CommonStatus.ACTIVE)).toBe("激活");
        expect(StatusUtils.getDisplayName(CommonStatus.PENDING)).toBe(
          "等待处理",
        );
        expect(
          StatusUtils.getDisplayName(CommonStatus.PENDING_VERIFICATION),
        ).toBe("等待验证");
        expect(StatusUtils.getDisplayName(CommonStatus.DELETED)).toBe("已删除");
      });
    });

    describe("getDescription", () => {
      it("should return correct descriptions", () => {
        expect(StatusUtils.getDescription(CommonStatus.ACTIVE)).toBe(
          "资源处于激活状态，可正常使用",
        );
        expect(StatusUtils.getDescription(CommonStatus.PENDING)).toBe(
          "资源等待处理中，请稍后再试",
        );
        expect(
          StatusUtils.getDescription(CommonStatus.PENDING_VERIFICATION),
        ).toBe("资源等待验证，请检查邮箱或手机短信");
        expect(StatusUtils.getDescription(CommonStatus.DELETED)).toBe(
          "资源已被删除，无法恢复",
        );
      });
    });
  });

  describe("StatusGroups", () => {
    it("should have correct AVAILABLE group", () => {
      expect(StatusGroups.AVAILABLE).toEqual([CommonStatus.ACTIVE]);
    });

    it("should have correct UNAVAILABLE group", () => {
      expect(StatusGroups.UNAVAILABLE).toContain(CommonStatus.INACTIVE);
      expect(StatusGroups.UNAVAILABLE).toContain(CommonStatus.SUSPENDED);
      expect(StatusGroups.UNAVAILABLE).toContain(CommonStatus.DELETED);
      expect(StatusGroups.UNAVAILABLE).toContain(CommonStatus.EXPIRED);
      expect(StatusGroups.UNAVAILABLE).toContain(CommonStatus.REVOKED);
      expect(StatusGroups.UNAVAILABLE).toContain(CommonStatus.LOCKED);
    });

    it("should have correct TEMPORARY group", () => {
      expect(StatusGroups.TEMPORARY).toEqual([
        CommonStatus.PENDING,
        CommonStatus.PENDING_VERIFICATION,
      ]);
    });

    it("should have correct FINAL group", () => {
      expect(StatusGroups.FINAL).toEqual([
        CommonStatus.DELETED,
        CommonStatus.REVOKED,
      ]);
    });
  });
});
