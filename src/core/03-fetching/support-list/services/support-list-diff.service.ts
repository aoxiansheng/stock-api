import { Injectable } from "@nestjs/common";
import { SymbolValidationUtils } from "@common/utils/symbol-validation.util";
import { createHash } from "crypto";

export type SupportListItemRecord = Record<string, unknown>;

export interface SupportListDiffResult {
  added: SupportListItemRecord[];
  updated: SupportListItemRecord[];
  removed: string[];
}

@Injectable()
export class SupportListDiffService {
  diff(
    previousItems: SupportListItemRecord[],
    currentItems: SupportListItemRecord[],
  ): SupportListDiffResult {
    const previousIndex = this.buildSnapshotIndex(previousItems);
    const currentIndex = this.buildSnapshotIndex(currentItems);

    const added: SupportListItemRecord[] = [];
    const updated: SupportListItemRecord[] = [];
    const removed: string[] = [];

    for (const [symbol, currentValue] of currentIndex.entries()) {
      const previousValue = previousIndex.get(symbol);
      if (!previousValue) {
        added.push(currentValue.item);
        continue;
      }
      if (previousValue.hash !== currentValue.hash) {
        updated.push(currentValue.item);
      }
    }

    for (const symbol of previousIndex.keys()) {
      if (!currentIndex.has(symbol)) {
        removed.push(symbol);
      }
    }

    return {
      added: this.sortBySymbol(added),
      updated: this.sortBySymbol(updated),
      removed: removed.sort((a, b) => a.localeCompare(b)),
    };
  }

  private buildSnapshotIndex(items: SupportListItemRecord[]) {
    const index = new Map<string, { item: SupportListItemRecord; hash: string }>();
    for (const item of items || []) {
      const normalizedItem = this.toItemRecord(item);
      if (!normalizedItem) {
        continue;
      }

      const symbol = this.extractSymbol(normalizedItem);
      if (!symbol) {
        continue;
      }

      index.set(symbol, {
        item: {
          ...normalizedItem,
          symbol,
        },
        hash: this.hashItem(normalizedItem),
      });
    }
    return index;
  }

  private sortBySymbol(items: SupportListItemRecord[]): SupportListItemRecord[] {
    return [...items].sort((a, b) => {
      const symbolA = this.extractSymbol(a) || "";
      const symbolB = this.extractSymbol(b) || "";
      return symbolA.localeCompare(symbolB);
    });
  }

  private extractSymbol(item: SupportListItemRecord): string {
    const raw = item?.symbol;
    return typeof raw === "string"
      ? SymbolValidationUtils.normalizeSymbol(raw)
      : "";
  }

  private toItemRecord(value: unknown): SupportListItemRecord | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    return value as SupportListItemRecord;
  }

  private hashItem(item: SupportListItemRecord): string {
    return createHash("sha256")
      .update(this.stableSerialize(item))
      .digest("hex");
  }

  private stableSerialize(value: unknown): string {
    if (value === null || value === undefined) {
      return "null";
    }

    if (typeof value !== "object") {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableSerialize(item)).join(",")}]`;
    }

    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort((a, b) => a.localeCompare(b));
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${this.stableSerialize(record[key])}`)
      .join(",")}}`;
  }
}
